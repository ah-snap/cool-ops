/* global chrome */
/**
 * Cool Ops Jira Linker content script.
 *
 * Scans text nodes under jira.snapone.com pages for patterns that match
 * resources in the Cool Ops tool, and injects a small 🛠 button after each
 * match that opens the matching Cool Ops page in a new tab.
 *
 * Patterns (see PATTERNS array):
 *   Labeled (preferred — capture the first whitespace token after the label):
 *     "DCode: <token>"                     -> /dealer/{token}
 *     "Controller Common Name: <token>"    -> /licenses/{token}
 *     "Account Name: <token>"              -> /licenses/{token}
 *       (also catches "my.Control4 Account Name: ..." since it contains the label)
 *     "Controller MAC Address: <token>"    -> /licenses/{token}
 *       (also catches "Director / Controller MAC Address: ...")
 *
 *   Bare tokens (fallback for inline mentions):
 *     D + 4-8 digits                        -> /dealer/{token}
 *     Control4_<model>_<12 hex> (case-insensitive) -> /licenses/{token}
 *     000FFF + 6 hex (case-insensitive)     -> /licenses/{token}
 *     00:0F:FF:XX:XX:XX (case-insensitive)  -> /licenses/{token}
 *     email address                         -> /users/{token}
 */

const DEFAULT_BASE_URL = "http://localhost:5173";
const MARKER_ATTR = "data-cool-ops-processed";
const LABELED_DONE_ATTR = "data-cool-ops-labeled";
const BUTTON_CLASS = "cool-ops-link-btn";

const PATTERNS = [
  // --- Labeled patterns -----------------------------------------------------
  {
    name: "labeledDCode",
    kind: "labeled",
    // "DCode: D48407" — capture the value token after the colon.
    regex: /\bDCode:\s*(\S+)/gi,
    buildPath: (match) => `/dealer/${encodeURIComponent(match[1])}`,
    label: (match) => `Open dealer ${match[1]} in Cool Ops`,
    captureGroup: 1,
  },
  {
    name: "labeledControllerCommonName",
    kind: "labeled",
    // "Controller Common Name: LinShawnC469e8fb72"
    regex: /\bController Common Name:\s*(\S+)/gi,
    buildPath: (match) => `/licenses/${encodeURIComponent(match[1])}`,
    label: (match) => `Open controller ${match[1]} in Cool Ops`,
    captureGroup: 1,
  },
  {
    name: "labeledAccountName",
    kind: "labeled",
    // "Account Name: control4_core5_000FFF9B24DD"
    // Also catches "my.Control4 Account Name: ..." because the label substring
    // still appears in the text.
    regex: /\bAccount Name:\s*(\S+)/gi,
    buildPath: (match) => `/licenses/${encodeURIComponent(match[1])}`,
    label: (match) => `Open account ${match[1]} in Cool Ops`,
    captureGroup: 1,
  },
  {
    name: "labeledControllerMacAddress",
    kind: "labeled",
    // "Controller MAC Address: 000FFFA1A378"
    // Also catches "Director / Controller MAC Address: ..." because the label
    // substring still appears in the text.
    regex: /\bController MAC Address:\s*(\S+)/gi,
    buildPath: (match) => `/licenses/${encodeURIComponent(match[1])}`,
    label: (match) => `Open controller MAC ${match[1]} in Cool Ops`,
    captureGroup: 1,
  },

  // --- Bare tokens (for inline mentions outside the labeled rows) -----------
  {
    name: "bareDCode",
    kind: "bare",
    // D followed by 4-8 digits.
    regex: /\bD\d{4,8}\b/g,
    buildPath: (match) => `/dealer/${encodeURIComponent(match[0])}`,
    label: (match) => `Open dealer ${match[0]} in Cool Ops`,
  },
  {
    name: "bareControl4AccountName",
    kind: "bare",
    // control4_<model>_<12 hex>, case-insensitive.
    regex: /\bcontrol4_[A-Za-z0-9]+_[0-9A-Fa-f]{12}\b/gi,
    buildPath: (match) => `/licenses/${encodeURIComponent(match[0])}`,
    label: (match) => `Open account ${match[0]} in Cool Ops`,
  },
  {
    name: "bareControl4Mac",
    kind: "bare",
    // 12 hex characters starting with 000FFF, no separators.
    regex: /\b000FFF[0-9A-Fa-f]{6}\b/gi,
    buildPath: (match) => `/licenses/${encodeURIComponent(match[0])}`,
    label: (match) => `Open controller MAC ${match[0]} in Cool Ops`,
  },
  {
    name: "bareControl4MacColon",
    kind: "bare",
    // Colon-separated form of the same: 00:0F:FF:XX:XX:XX (case-insensitive).
    regex: /\b00:0F:FF(?::[0-9A-Fa-f]{2}){3}\b/gi,
    buildPath: (match) => `/licenses/${encodeURIComponent(match[0])}`,
    label: (match) => `Open controller MAC ${match[0]} in Cool Ops`,
  },
  {
    name: "bareEmail",
    kind: "bare",
    // Simple, conservative email matcher — local@domain.tld with at least
    // one dot in the domain. Good enough for the kinds of addresses that
    // show up in Jira tickets without false-positive-ing on things like
    // `user@example` or `@mention`.
    regex: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    buildPath: (match) => `/users/${encodeURIComponent(match[0])}`,
    label: (match) => `Look up ${match[0]} in Cool Ops`,
  },
];

const LABELED_PATTERNS = PATTERNS.filter((p) => p.kind === "labeled");
const BARE_PATTERNS = PATTERNS.filter((p) => p.kind === "bare");

// A single RegExp that OR's all the BARE pattern sources, used to short-circuit
// per-text-node scanning. Labeled patterns are evaluated at the element level.
const COMBINED_BARE_REGEX = new RegExp(
  BARE_PATTERNS.map((p) => `(?:${p.regex.source})`).join("|"),
  "g"
);

let baseUrl = DEFAULT_BASE_URL;

function normalizeBaseUrl(value) {
  if (!value) return DEFAULT_BASE_URL;
  return String(value).replace(/\/$/, "");
}

async function loadBaseUrl() {
  try {
    const stored = await chrome.storage.sync.get({ baseUrl: DEFAULT_BASE_URL });
    baseUrl = normalizeBaseUrl(stored.baseUrl);
  } catch (err) {
    console.warn("[cool-ops] Failed to load baseUrl, using default.", err);
    baseUrl = DEFAULT_BASE_URL;
  }
}

chrome.storage?.onChanged?.addListener((changes, area) => {
  if (area === "sync" && changes.baseUrl) {
    baseUrl = normalizeBaseUrl(changes.baseUrl.newValue);
  }
});

function buildUrl(path) {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function makeButton({ href, label }) {
  const btn = document.createElement("a");
  btn.className = BUTTON_CLASS;
  btn.href = href;
  btn.target = "_blank";
  btn.rel = "noopener noreferrer";
  btn.title = label;
  btn.setAttribute("aria-label", label);
  btn.textContent = "🛠";
  // Prevent clicks from bubbling up into Jira's own click handlers
  // (e.g. opening an issue card, toggling collapse, etc.).
  btn.addEventListener("click", (e) => e.stopPropagation());
  btn.addEventListener("mousedown", (e) => e.stopPropagation());
  return btn;
}

/**
 * Given a text node, find all BARE pattern matches.
 * Returns an array of { start, end, path, label } sorted by start, with
 * overlapping matches removed (earliest wins).
 */
function findMatches(text) {
  const hits = [];
  for (const pattern of BARE_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let m;
    while ((m = pattern.regex.exec(text)) !== null) {
      const group = pattern.captureGroup ?? 0;
      const value = m[group];
      if (!value) continue;

      // Compute absolute start/end of the captured group within `text`.
      let start = m.index;
      if (group > 0) {
        // Find the captured group's start relative to the full match.
        const before = m[0].indexOf(value);
        start = m.index + (before >= 0 ? before : 0);
      }
      const end = start + value.length;

      hits.push({
        start,
        end,
        path: pattern.buildPath(m),
        label: pattern.label(m),
      });
    }
  }

  hits.sort((a, b) => a.start - b.start || a.end - b.end);

  // Drop overlaps — keep the first, skip anything that starts before the
  // previous one ended.
  const nonOverlapping = [];
  let lastEnd = -1;
  for (const h of hits) {
    if (h.start >= lastEnd) {
      nonOverlapping.push(h);
      lastEnd = h.end;
    }
  }
  return nonOverlapping;
}

/**
 * Process a single text node: splits it into runs and injects buttons after
 * each match. Mutates the DOM by replacing the text node with a span
 * containing the rebuilt content.
 */
function processTextNode(textNode) {
  if (!textNode.parentNode) return;
  const text = textNode.nodeValue ?? "";
  if (!text) return;

  // Quick short-circuit — if nothing could match, skip the work.
  COMBINED_BARE_REGEX.lastIndex = 0;
  if (!COMBINED_BARE_REGEX.test(text)) return;

  const matches = findMatches(text);
  if (matches.length === 0) return;

  const frag = document.createDocumentFragment();
  let cursor = 0;

  for (const hit of matches) {
    if (hit.start > cursor) {
      frag.appendChild(
        document.createTextNode(text.slice(cursor, hit.start))
      );
    }

    frag.appendChild(document.createTextNode(text.slice(hit.start, hit.end)));
    frag.appendChild(
      makeButton({ href: buildUrl(hit.path), label: hit.label })
    );

    cursor = hit.end;
  }

  if (cursor < text.length) {
    frag.appendChild(document.createTextNode(text.slice(cursor)));
  }

  // Wrap in a span we can mark as processed so we don't re-scan these nodes.
  const wrapper = document.createElement("span");
  wrapper.setAttribute(MARKER_ATTR, "1");
  wrapper.appendChild(frag);
  textNode.parentNode.replaceChild(wrapper, textNode);
}

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "CODE",
  "PRE",
  "A", // don't inject inside existing links — avoid nested anchors
]);

function shouldSkipElement(el) {
  if (!el) return true;
  if (SKIP_TAGS.has(el.tagName)) return true;
  if (el.isContentEditable) return true;
  if (el.classList?.contains(BUTTON_CLASS)) return true;
  if (el.hasAttribute?.(MARKER_ATTR)) return true;
  return false;
}

// When the bare-token pass runs, skip text nodes whose ancestor already got a
// labeled match — otherwise `DCode: D48407` and `control4_core5_000FFF9B24DD`
// each end up with two 🛠 buttons (one from the labeled pattern, one from the
// bare pattern).
function hasLabeledAncestor(el) {
  let cur = el;
  while (cur && cur.nodeType === Node.ELEMENT_NODE) {
    if (cur.hasAttribute?.(LABELED_DONE_ATTR)) return true;
    cur = cur.parentElement;
  }
  return false;
}

function scanSubtree(root) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    if (!shouldSkipElement(root.parentElement)) {
      processTextNode(root);
    }
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  if (shouldSkipElement(root)) return;

  // Pass 1: labeled patterns. These frequently span multiple text nodes in
  // Jira (e.g. `<strong>DCode:</strong> D48407`), so we walk elements and
  // evaluate the element's combined textContent, then inject buttons next to
  // the text node that contains the captured value.
  scanLabeledInSubtree(root);

  // Pass 2: bare tokens inside individual text nodes.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
      if (hasLabeledAncestor(parent)) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue || !node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  let current;
  while ((current = walker.nextNode())) {
    nodes.push(current);
  }
  for (const node of nodes) {
    processTextNode(node);
  }

  // Pass 3: email anchors. Jira wraps email addresses in
  // `<a href="mailto:...">`, which we intentionally skip in the text-node
  // passes above to avoid nested <a>s. Instead, walk <a> elements and place
  // the 🛠 button immediately after each one.
  scanEmailAnchorsInSubtree(root);
}

const EMAIL_ANCHOR_DONE_ATTR = "data-cool-ops-email-anchor";
const EMAIL_CORE_REGEX = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/;

function extractEmail(raw) {
  if (!raw) return null;
  // Strip mailto: prefix and any ?subject=... / #frag fragments.
  const withoutScheme = raw.replace(/^\s*mailto:/i, "").split(/[?#]/)[0];
  // Strip trailing punctuation Jira / users occasionally append (`.`, `,`, `;`).
  const trimmed = withoutScheme.replace(/[.,;)\]>\s]+$/g, "").trim();
  const match = trimmed.match(EMAIL_CORE_REGEX);
  return match ? match[0] : null;
}

function scanEmailAnchorsInSubtree(root) {
  const anchors = [];
  if (root.nodeType === Node.ELEMENT_NODE && root.tagName === "A") {
    anchors.push(root);
  }
  if (root.nodeType === Node.ELEMENT_NODE) {
    root.querySelectorAll("a").forEach((a) => anchors.push(a));
  }

  for (const anchor of anchors) {
    if (anchor.hasAttribute(EMAIL_ANCHOR_DONE_ATTR)) continue;
    if (anchor.classList?.contains(BUTTON_CLASS)) continue;

    const href = anchor.getAttribute("href") || "";
    const email =
      (/^\s*mailto:/i.test(href) ? extractEmail(href) : null) ||
      extractEmail(anchor.textContent || "");

    if (!email) continue;

    const button = makeButton({
      href: buildUrl(`/users/${encodeURIComponent(email)}`),
      label: `Look up ${email} in Cool Ops`,
    });

    anchor.insertAdjacentElement("afterend", button);
    anchor.setAttribute(EMAIL_ANCHOR_DONE_ATTR, "1");
  }
}

// Walks every element under `root` and looks for labeled patterns in the
// element's own textContent. If a match is found, we locate the text node
// that actually contains the value and insert a 🛠 button next to it.
function scanLabeledInSubtree(root) {
  const elements = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode(el) {
      if (shouldSkipElement(el)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let current = root.nodeType === Node.ELEMENT_NODE ? root : walker.nextNode();
  if (current && !shouldSkipElement(current)) elements.push(current);
  while ((current = walker.nextNode())) {
    elements.push(current);
  }

  for (const el of elements) {
    // Skip if already processed or too shallow (no text of our own).
    if (el.hasAttribute(LABELED_DONE_ATTR)) continue;
    const text = el.textContent;
    if (!text) continue;

    let anyHit = false;
    for (const pattern of LABELED_PATTERNS) {
      pattern.regex.lastIndex = 0;
      let m;
      while ((m = pattern.regex.exec(text)) !== null) {
        const group = pattern.captureGroup ?? 0;
        const value = m[group];
        if (!value) continue;

        if (injectLabeledButton(el, value, pattern, m)) {
          anyHit = true;
        }
      }
    }

    if (anyHit) {
      el.setAttribute(LABELED_DONE_ATTR, "1");
    }
  }
}

// Locates the first text node under `container` whose value contains `token`
// and inserts a 🛠 button immediately after that text node. Returns true if
// a button was injected.
function injectLabeledButton(container, token, pattern, match) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node;
  while ((node = walker.nextNode())) {
    const idx = node.nodeValue.indexOf(token);
    if (idx === -1) continue;

    // Make sure we haven't already injected a button for this exact value in
    // this element (guards against duplicate passes).
    const existing = container.querySelectorAll(`a.${BUTTON_CLASS}`);
    for (const e of existing) {
      if (e.dataset.coolOpsToken === token && e.dataset.coolOpsPattern === pattern.name) {
        return false;
      }
    }

    const btn = makeButton({
      href: buildUrl(pattern.buildPath(match)),
      label: pattern.label(match),
    });
    btn.dataset.coolOpsToken = token;
    btn.dataset.coolOpsPattern = pattern.name;

    const parent = node.parentNode;
    if (!parent) return false;

    // Insert after the text node containing the token.
    if (node.nextSibling) {
      parent.insertBefore(btn, node.nextSibling);
    } else {
      parent.appendChild(btn);
    }
    return true;
  }

  return false;
}

// Debounce mutation-observer bursts so we don't thrash while Jira renders.
let pendingRoots = new Set();
let scanScheduled = false;
function scheduleScan(root) {
  if (root) pendingRoots.add(root);
  if (scanScheduled) return;
  scanScheduled = true;
  requestAnimationFrame(() => {
    scanScheduled = false;
    const roots = Array.from(pendingRoots);
    pendingRoots = new Set();
    for (const r of roots) {
      try {
        scanSubtree(r);
      } catch (err) {
        console.warn("[cool-ops] scanSubtree error", err);
      }
    }
  });
}

async function init() {
  await loadBaseUrl();
  scheduleScan(document.body);

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const added of m.addedNodes) {
        if (added.nodeType === Node.ELEMENT_NODE || added.nodeType === Node.TEXT_NODE) {
          scheduleScan(added);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

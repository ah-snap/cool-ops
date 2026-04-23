# Cool Ops Jira Linker (Chrome extension)

An unpacked Chrome extension (Manifest V3) that runs on `https://jira.snapone.com/*` and adds a small 🛠 button next to text that matches known Cool Ops resources. Clicking the button opens the matching page in the Cool Ops tool in a new tab.

## Patterns recognized

| Pattern                                    | Example                          | Opens in Cool Ops            |
| ------------------------------------------ | -------------------------------- | ---------------------------- |
| `D` + 6 digits                             | `D123456`                        | `/dealer/D123456`            |
| `Control4_<Model>_<12 hex>` (controller CN) | `Control4_HC800_000FFF123456`   | `/licenses/Control4_HC800_000FFF123456` |
| `Account Name: <token>` (first token)      | `Account Name: ABCD1234`         | `/licenses/ABCD1234`         |

Patterns live in [content.js](content.js) — add new ones to the `PATTERNS` array.

## Install (unpacked)

1. Open `chrome://extensions` in Chrome/Edge.
2. Toggle **Developer mode** on (top right).
3. Click **Load unpacked** and pick this folder (`chrome-extension/`).
4. Click the extension's icon to open the popup and set your Cool Ops base URL (defaults to `http://localhost:5173`). You can also configure it from `chrome://extensions` → the extension's **Details** → **Extension options**.

## Notes

- The content script observes DOM mutations so links appear as Jira renders tickets and panels.
- Buttons open in a new tab (`target="_blank"`) and stop click propagation so they don't trigger Jira's own handlers.
- Existing anchors, `<code>`, `<pre>`, inputs, and contenteditable regions are skipped.
- Base URL is stored in `chrome.storage.sync` under the key `baseUrl`.

import type { PortForwardLogEntry, PortForwardSummary } from "../../../actions/portForwardActions.ts";

export function extractAwsSsoPrompt(logs: PortForwardLogEntry[]): { url: string; code?: string; verificationUriComplete?: string } | null {
  let url = "";
  let code = "";
  let verificationUriComplete = "";
  const urlRegex = /(https:\/\/[^\s]+)/i;

  for (let index = logs.length - 1; index >= 0; index -= 1) {
    const message = logs[index].message.trim();
    const urlMatch = message.match(urlRegex);
    const discoveredUrl = urlMatch ? urlMatch[1] : "";

    // Prefer a complete URL that already has the code embedded as a query param
    if (!verificationUriComplete && discoveredUrl) {
      const embeddedCode = discoveredUrl.match(/[?&][a-z_]*code[a-z_]*=([A-Z0-9]{4}-[A-Z0-9]{4})/i);
      if (embeddedCode) {
        verificationUriComplete = discoveredUrl;
        if (!code) {
          code = embeddedCode[1];
        }
        if (!url) {
          url = discoveredUrl;
        }
      }
    }

    if (!url && discoveredUrl) {
      url = discoveredUrl;
    }

    if (!code) {
      const match = message.match(/\b[A-Z0-9]{4}-[A-Z0-9]{4}\b/);
      if (match) {
        code = match[0];
      }
    }

    if (url) {
      return {
        url,
        code: code || undefined,
        verificationUriComplete: verificationUriComplete || undefined
      };
    }
  }

  return null;
}

export function statusColor(status: PortForwardSummary["status"]): string {
  if (status === "running") {
    return "#0f766e";
  }

  if (status === "starting") {
    return "#1d4ed8";
  }

  if (status === "error") {
    return "#b91c1c";
  }

  if (status === "success") {
    return "#166534";
  }

  return "#6b7280";
}

export function statusIndicator(status: PortForwardSummary["status"]): string {
  switch (status) {
    case "running":
    case "success":
      return "🟢";
    case "starting":
      return "🔵";
    case "error":
      return "🔴";
    case "stopped":
      return "🟡";
    case "idle":
    default:
      return "⚪";
  }
}

/**
 * The AWS credentials job is special: its meaningful "health" is whether the
 * credentials file on disk is fresh, not whether the job has been run in this
 * session. A successful run with a stale file is still stale; an unrun job
 * with a fresh file is fine.
 */
export function awsCredentialsIndicator(
  status: PortForwardSummary["status"],
  isFresh: boolean | null
): string {
  if (status === "starting") return "🔵";
  if (status === "error") return "🔴";
  if (isFresh === null) return "⚪";
  return isFresh ? "🟢" : "🟡";
}

/**
 * Given the current status of a forward, return the action clicking its
 * indicator should trigger. `null` means the button should be disabled (e.g.
 * mid-transition).
 */
export function nextIndicatorAction(
  status: PortForwardSummary["status"],
  runMode: PortForwardSummary["runMode"]
): "start" | "restart" | null {
  if (status === "starting") {
    return null;
  }

  if (status === "idle" || status === "stopped") {
    return "start";
  }

  // For one-shot jobs, "restart" isn't meaningful on the server — start just
  // runs them again, which is what we want after success/error.
  if (runMode === "oneshot") {
    return "start";
  }

  // running / error → restart
  return "restart";
}

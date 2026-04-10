import type { PortForwardLogEntry, PortForwardSummary } from "../../../actions/portForwardActions.ts";

export function extractAwsSsoPrompt(logs: PortForwardLogEntry[]): { url: string; code: string } | null {
  let url = "";
  let code = "";

  for (let index = logs.length - 1; index >= 0; index -= 1) {
    const message = logs[index].message.trim();

    if (!url && /^https:\/\//i.test(message)) {
      url = message;
    }

    if (!code) {
      const match = message.match(/\b[A-Z0-9]{4}-[A-Z0-9]{4}\b/);
      if (match) {
        code = match[0];
      }
    }

    if (url && code) {
      return { url, code };
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

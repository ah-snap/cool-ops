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

import React from "react";
import type { PortForwardLogEntry, PortForwardSummary } from "../../../actions/portForwardActions.ts";
import { statusColor } from "./utils.ts";

type AwsSsoPrompt = { url: string; code: string; verificationUriComplete?: string };

type PortForwardDetailsProps = {
  selectedForward: PortForwardSummary | null;
  visibleLogs: PortForwardLogEntry[];
  awsSsoPrompt: AwsSsoPrompt | null;
  busyAction: "start" | "restart" | "stop" | null;
  onAction: (action: "start" | "restart" | "stop") => Promise<void>;
  onAwsSsoAssist: () => Promise<void>;
};

export default function PortForwardDetails({
  selectedForward,
  visibleLogs,
  awsSsoPrompt,
  busyAction,
  onAction,
  onAwsSsoAssist
}: PortForwardDetailsProps) {
  return (
    <div className="portForwardDetails">
      {!selectedForward && <div>Select a port forward.</div>}

      {selectedForward && (
        <>
          <div className="portForwardDetailsHeader">
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedForward.name}</div>
              <div className="portForwardDetailsStatus">
                Status: <span style={{ color: statusColor(selectedForward.status), fontWeight: 700 }}>{selectedForward.status}</span>
              </div>
            </div>
            <div className="portForwardActionRow">
              <button disabled={busyAction !== null} onClick={() => onAction("start")}>
                {selectedForward.runMode === "oneshot" ? "Run" : "Start"}
              </button>
              {selectedForward.runMode === "persistent" && (
                <button disabled={busyAction !== null} onClick={() => onAction("restart")}>Restart</button>
              )}
              {selectedForward.runMode === "persistent" && (
                <button disabled={busyAction !== null} onClick={() => onAction("stop")}>Stop</button>
              )}
            </div>
          </div>

          <div className="portForwardCommand">
            <strong>Command:</strong> {selectedForward.command} {selectedForward.args.join(" ")}
          </div>

          {awsSsoPrompt && (
            <div className="portForwardSsoPrompt">
              <div style={{ fontSize: 12, marginBottom: 6 }}>
                <strong>SSO Device Code:</strong> {awsSsoPrompt.code}
              </div>
              <div className="portForwardSsoUrl">
                <strong>SSO URL:</strong> {awsSsoPrompt.url}
              </div>
              <button onClick={onAwsSsoAssist}>
                {awsSsoPrompt.verificationUriComplete ? "Open Login Page (auto-fills code)" : "Copy Code + Open Login Page"}
              </button>
            </div>
          )}

          <div className="portForwardLogPanel">
            {visibleLogs.length === 0 && <div>No output yet.</div>}
            {visibleLogs.map((entry) => (
              <div key={entry.id}>
                [{new Date(entry.timestamp).toLocaleTimeString()}] [{entry.stream}] {entry.message}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

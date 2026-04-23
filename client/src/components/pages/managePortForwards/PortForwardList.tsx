import React from "react";
import type { PortForwardSummary } from "../../../actions/portForwardActions.ts";
import { awsCredentialsIndicator, nextIndicatorAction, statusColor, statusIndicator } from "./utils.ts";
import { AWS_CREDENTIALS_FORWARD_ID } from "./startupSequence.ts";

type PortForwardListProps = {
  forwards: PortForwardSummary[];
  selectedId: string;
  onSelect: (id: string) => void;
  busyAction: "start" | "restart" | "stop" | null;
  onIndicatorAction: (id: string, action: "start" | "restart") => void | Promise<void>;
  awsCredentialsFresh: boolean | null;
};

export default function PortForwardList({
  forwards,
  selectedId,
  onSelect,
  busyAction,
  onIndicatorAction,
  awsCredentialsFresh
}: PortForwardListProps) {
  return (
    <div className="portForwardList">
      {forwards.map((forward) => {
        const indicatorAction = nextIndicatorAction(forward.status, forward.runMode);
        const indicatorDisabled = indicatorAction === null || busyAction !== null;
        const indicatorTitle = indicatorDisabled
          ? `${forward.name} — ${forward.status}`
          : indicatorAction === "start"
            ? `Start ${forward.name}`
            : `Restart ${forward.name}`;
        const indicator =
          forward.id === AWS_CREDENTIALS_FORWARD_ID
            ? awsCredentialsIndicator(forward.status, awsCredentialsFresh)
            : statusIndicator(forward.status);

        return (
          <div
            key={forward.id}
            className={`portForwardListItem ${selectedId === forward.id ? "portForwardListItemSelected" : ""}`}
          >
            <button
              type="button"
              className="portForwardIndicator"
              disabled={indicatorDisabled}
              title={indicatorTitle}
              aria-label={indicatorTitle}
              onClick={(e) => {
                e.stopPropagation();
                if (indicatorAction) {
                  onIndicatorAction(forward.id, indicatorAction);
                }
              }}
            >
              <span aria-hidden="true">{indicator}</span>
            </button>
            <button
              type="button"
              className="portForwardListItemBody"
              onClick={() => onSelect(forward.id)}
            >
              <div style={{ fontWeight: 700 }}>{forward.name}</div>
              <div className="portForwardListDescription">{forward.description}</div>
              <div className="portForwardListStatus" style={{ color: statusColor(forward.status) }}>
                {forward.status.toUpperCase()} {forward.pid ? `(pid ${forward.pid})` : ""}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

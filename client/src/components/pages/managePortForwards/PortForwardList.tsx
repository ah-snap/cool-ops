import React from "react";
import type { PortForwardSummary } from "../../../actions/portForwardActions.ts";
import { statusColor } from "./utils.ts";

type PortForwardListProps = {
  forwards: PortForwardSummary[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export default function PortForwardList({ forwards, selectedId, onSelect }: PortForwardListProps) {
  return (
    <div className="portForwardList">
      {forwards.map((forward) => (
        <button
          key={forward.id}
          onClick={() => onSelect(forward.id)}
          className={`portForwardListItem ${selectedId === forward.id ? "portForwardListItemSelected" : ""}`}
        >
          <div style={{ fontWeight: 700 }}>{forward.name}</div>
          <div className="portForwardListDescription">{forward.description}</div>
          <div className="portForwardListStatus" style={{ color: statusColor(forward.status) }}>
            {forward.status.toUpperCase()} {forward.pid ? `(pid ${forward.pid})` : ""}
          </div>
        </button>
      ))}
    </div>
  );
}

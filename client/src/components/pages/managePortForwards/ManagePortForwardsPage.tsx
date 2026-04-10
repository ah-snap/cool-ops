import React from "react";
import PageShell from "../../common/layout/PageShell.tsx";
import PortForwardDetails from "./PortForwardDetails.tsx";
import PortForwardList from "./PortForwardList.tsx";
import { usePortForwardsManager } from "./usePortForwardsManager.ts";
import "./managePortForwards.css";

export default function ManagePortForwardsPage() {
  const {
    forwards,
    selectedId,
    selectedForward,
    visibleLogs,
    awsSsoPrompt,
    loading,
    error,
    busyAction,
    startupBusy,
    setSelectedId,
    performAction,
    handleAwsSsoAssist,
    handleStartupSequence
  } = usePortForwardsManager();

  return (
    <PageShell containerClassName="managePortForwardsPage" containerStyle={{ height: "100%" }}>
        <div className="managePortForwardsHeader">
          <h1 className="managePortForwardsTitle">Manage Port Forwards</h1>
          <button disabled={loading || startupBusy || busyAction !== null} onClick={handleStartupSequence}>
            {startupBusy ? "Running Startup Sequence..." : "Run Startup Sequence"}
          </button>
        </div>
        <p>
          Start and monitor host-side tunnel processes required by the app.
          This currently includes Security_16 SQL via AWS SSM.
        </p>

        {error && (
          <div className="managePortForwardsError">
            {error}
          </div>
        )}

        {loading && <div>Loading forwards...</div>}

        {!loading && (
          <div className="managePortForwardsGrid">
            <PortForwardList forwards={forwards} selectedId={selectedId} onSelect={setSelectedId} />
            <PortForwardDetails
              selectedForward={selectedForward}
              visibleLogs={visibleLogs}
              awsSsoPrompt={awsSsoPrompt}
              busyAction={busyAction}
              onAction={performAction}
              onAwsSsoAssist={handleAwsSsoAssist}
            />
          </div>
        )}
    </PageShell>
  );
}

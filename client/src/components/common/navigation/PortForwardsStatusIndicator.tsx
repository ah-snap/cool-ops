import { useCallback, useEffect, useState } from "react";
import {
  fetchAwsCredentialsFreshness,
  fetchPortForwards,
  restartPortForward,
  startPortForward,
  type PortForwardSummary,
} from "../../../actions/portForwardActions.ts";
import { awsCredentialsIndicator, nextIndicatorAction, statusIndicator } from "../../pages/managePortForwards/utils.ts";
import { AWS_CREDENTIALS_FORWARD_ID, CREDENTIALS_MAX_AGE_HOURS, runStartupSequence } from "../../pages/managePortForwards/startupSequence.ts";
import "./navigation.css";

// Lightweight poll — the nav bar is visible everywhere, but forward state
// generally only changes while the user is actively on the Manage Port
// Forwards page. Keeping this infrequent keeps it cheap.
const POLL_INTERVAL_MS = 10_000;

export default function PortForwardsStatusIndicator() {
  const [forwards, setForwards] = useState<PortForwardSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [startupBusy, setStartupBusy] = useState(false);
  const [awsCredentialsFresh, setAwsCredentialsFresh] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [result, freshness] = await Promise.all([
        fetchPortForwards(),
        fetchAwsCredentialsFreshness(CREDENTIALS_MAX_AGE_HOURS).catch(() => null),
      ]);
      setForwards(result);
      setAwsCredentialsFresh(freshness ? freshness.isFresh : null);
    } catch {
      setForwards([]);
      setAwsCredentialsFresh(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (cancelled) return;
      await refresh();
    };

    load();
    const interval = window.setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [refresh]);

  const handleIndicatorClick = async (forward: PortForwardSummary) => {
    if (busy || startupBusy) return;
    const action = nextIndicatorAction(forward.status, forward.runMode);
    if (!action) return;

    setBusy(true);
    try {
      const updated =
        action === "start"
          ? await startPortForward(forward.id)
          : await restartPortForward(forward.id);
      setForwards((current) =>
        current
          ? current.map((item) => (item.id === updated.id ? updated : item))
          : current
      );
    } catch {
      // Errors surface on the manage page; pick up latest state here.
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleStartupSequence = async () => {
    if (busy || startupBusy) return;
    setStartupBusy(true);
    try {
      await runStartupSequence({ onForwardsChange: setForwards });
    } catch {
      refresh();
    } finally {
      setStartupBusy(false);
    }
  };

  if (!forwards || forwards.length === 0) return null;

  const sharedBtnStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    padding: 2,
    fontSize: "inherit",
    lineHeight: 1,
  };

  return <div className="portForwardsStatusIndicator">
<li
      className="portForwardsNavIndicator"
      aria-label="Port forward statuses"
      style={{
        listStyle: "none",
        border: "none",
        margin: "-0.5em 0.75em 0.5em",
        padding: 0,
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontSize: "1em",
      }}
    >
      {forwards.map((forward) => {
        const indicatorAction = nextIndicatorAction(forward.status, forward.runMode);
        const disabled = indicatorAction === null || busy || startupBusy;
        const title = disabled
          ? `${forward.name}: ${forward.status}`
          : indicatorAction === "start"
            ? `Start ${forward.name}`
            : `Restart ${forward.name}`;
        const indicator =
          forward.id === AWS_CREDENTIALS_FORWARD_ID
            ? awsCredentialsIndicator(forward.status, awsCredentialsFresh)
            : statusIndicator(forward.status);

        return (
          <button
            key={forward.id}
            type="button"
            onClick={() => handleIndicatorClick(forward)}
            disabled={disabled}
            title={title}
            aria-label={title}
            style={{
              ...sharedBtnStyle,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.6 : 1,
            }}
          >
            {indicator}
          </button>
        );
      })}
      <button
        type="button"
        onClick={handleStartupSequence}
        disabled={busy || startupBusy}
        title="Run startup sequence"
        aria-label="Run startup sequence"
        style={{
          ...sharedBtnStyle,
          marginLeft: 4,
          cursor: busy || startupBusy ? "not-allowed" : "pointer",
          opacity: busy || startupBusy ? 0.6 : 1,
        }}
      >
        {startupBusy ? "⏳" : "⏩"}
      </button>
    </li>
  </div>
}

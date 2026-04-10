import React, { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import "../../stylesheets/categories.css";
import {
  fetchAwsCredentialsFreshness,
  fetchPortForwardLogs,
  fetchPortForwards,
  restartPortForward,
  startPortForward,
  stopPortForward,
  type PortForwardLogEntry,
  type PortForwardSummary
} from "../../actions/portForwardActions.ts";
import { SOCKET_BASE_URL } from "../../config.ts";

type PortForwardEvent = {
  id: string;
  type: "status" | "log";
  state: PortForwardSummary;
  entry?: PortForwardLogEntry;
};

const MAX_VISIBLE_LOGS = 500;
const AWS_CREDENTIALS_FORWARD_ID = "aws-credentials-refresh";
const CREDENTIALS_MAX_AGE_HOURS = 8;
const POLL_INTERVAL_MS = 1500;
const MAX_WAIT_MS = 15 * 60 * 1000;

function extractAwsSsoPrompt(logs: PortForwardLogEntry[]): { url: string; code: string } | null {
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

function statusColor(status: PortForwardSummary["status"]): string {
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

export default function ManagePortForwardsPage() {
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const [forwards, setForwards] = useState<PortForwardSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [logsById, setLogsById] = useState<Record<string, PortForwardLogEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"start" | "restart" | "stop" | null>(null);
  const [startupBusy, setStartupBusy] = useState(false);

  const selectedForward = useMemo(
    () => forwards.find((forward) => forward.id === selectedId) ?? null,
    [forwards, selectedId]
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const initialForwards = await fetchPortForwards();
        setForwards(initialForwards);

        if (initialForwards.length > 0) {
          const firstId = initialForwards[0].id;
          setSelectedId(firstId);
          const logs = await fetchPortForwardLogs(firstId);
          setLogsById({ [firstId]: logs });
        }
      } catch (err) {
        setError((err as Error).message || "Failed to load port forwards.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    if (logsById[selectedId]) {
      return;
    }

    fetchPortForwardLogs(selectedId)
      .then((logs) => {
        setLogsById((current) => ({ ...current, [selectedId]: logs }));
      })
      .catch((err) => {
        setError((err as Error).message || "Failed to load logs.");
      });
  }, [selectedId]);

  useEffect(() => {
    const socket = io(SOCKET_BASE_URL, {
      transports: ["websocket"]
    });
    socketRef.current = socket;

    socket.on("connect_error", (err: Error) => {
      setError(err.message || "Socket connection failed.");
    });

    socket.on("portForwards:event", (event: PortForwardEvent) => {
      setForwards((current) => {
        const next = [...current];
        const index = next.findIndex((item) => item.id === event.id);

        if (index >= 0) {
          next[index] = event.state;
        } else {
          next.push(event.state);
        }

        return next;
      });

      if (event.type === "log" && event.entry) {
        setLogsById((current) => {
          const existing = current[event.id] || [];
          const merged = [...existing, event.entry].slice(-MAX_VISIBLE_LOGS);
          return { ...current, [event.id]: merged };
        });
      }
    });

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    socket.emit("portForwards:subscribe", { id: selectedId });

    return () => {
      socket.emit("portForwards:unsubscribe", { id: selectedId });
    };
  }, [selectedId]);

  const performAction = async (action: "start" | "restart" | "stop") => {
    if (!selectedForward) {
      return;
    }

    setBusyAction(action);
    setError(null);

    try {
      let result: PortForwardSummary;

      if (action === "start") {
        result = await startPortForward(selectedForward.id);
      } else if (action === "restart") {
        result = await restartPortForward(selectedForward.id);
      } else {
        result = await stopPortForward(selectedForward.id);
      }

      setForwards((current) => current.map((item) => (item.id === result.id ? result : item)));
    } catch (err) {
      setError((err as Error).message || "Failed to run action.");
    } finally {
      setBusyAction(null);
    }
  };

  const visibleLogs = selectedId ? logsById[selectedId] || [] : [];
  const awsSsoPrompt = useMemo(() => {
    if (!selectedForward || selectedForward.id !== "aws-credentials-refresh") {
      return null;
    }

    return extractAwsSsoPrompt(visibleLogs);
  }, [selectedForward, visibleLogs]);

  const handleAwsSsoAssist = async () => {
    if (!awsSsoPrompt) {
      return;
    }

    setError(null);

    if (!navigator.clipboard?.writeText) {
      setError("Clipboard API is unavailable in this browser context.");
      return;
    }

    try {
      await navigator.clipboard.writeText(awsSsoPrompt.code);
      const opened = window.open(awsSsoPrompt.url, "_blank", "noopener,noreferrer");
      if (!opened) {
        setError("Pop-up was blocked. Please allow pop-ups for this site.");
      }
    } catch (err) {
      setError((err as Error).message || "Failed to copy code and open SSO page.");
    }
  };

  const waitForOneShotCompletion = async (id: string): Promise<PortForwardSummary> => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < MAX_WAIT_MS) {
      const latestForwards = await fetchPortForwards();
      setForwards(latestForwards);

      const summary = latestForwards.find((forward) => forward.id === id);
      if (!summary) {
        throw new Error(`Missing command state for ${id}.`);
      }

      if (summary.status === "success") {
        return summary;
      }

      if (summary.status === "error") {
        throw new Error(`${summary.name} failed. Check logs for details.`);
      }

      await new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), POLL_INTERVAL_MS);
      });
    }

    throw new Error("Timed out waiting for AWS credentials update to finish.");
  };

  const handleStartupSequence = async () => {
    setStartupBusy(true);
    setError(null);

    try {
      const freshness = await fetchAwsCredentialsFreshness(CREDENTIALS_MAX_AGE_HOURS);
      let currentForwards = await fetchPortForwards();
      setForwards(currentForwards);

      const credentialsJob = currentForwards.find((forward) => forward.id === AWS_CREDENTIALS_FORWARD_ID);
      if (!credentialsJob) {
        throw new Error("Missing Update AWS Credentials command.");
      }

      if (!freshness.isFresh) {
        if (credentialsJob.status !== "running" && credentialsJob.status !== "starting") {
          await startPortForward(AWS_CREDENTIALS_FORWARD_ID);
        }

        await waitForOneShotCompletion(AWS_CREDENTIALS_FORWARD_ID);
        currentForwards = await fetchPortForwards();
        setForwards(currentForwards);
      }

      for (const forward of currentForwards) {
        if (forward.id === AWS_CREDENTIALS_FORWARD_ID) {
          continue;
        }

        if (forward.runMode !== "persistent") {
          continue;
        }

        if (forward.status === "running" || forward.status === "starting") {
          continue;
        }

        await startPortForward(forward.id);
      }

      const refreshed = await fetchPortForwards();
      setForwards(refreshed);
    } catch (err) {
      setError((err as Error).message || "Failed startup sequence.");
    } finally {
      setStartupBusy(false);
    }
  };

  return (
    <div className="categoryWrapper">
      <div className="categoryContainer" style={{width: "80%", height: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ marginBottom: 0 }}>Manage Port Forwards</h1>
          <button disabled={loading || startupBusy || busyAction !== null} onClick={handleStartupSequence}>
            {startupBusy ? "Running Startup Sequence..." : "Run Startup Sequence"}
          </button>
        </div>
        <p>
          Start and monitor host-side tunnel processes required by the app.
          This currently includes Security_16 SQL via AWS SSM.
        </p>

        {error && (
          <div style={{ color: "#b91c1c", marginBottom: 12 }}>
            {error}
          </div>
        )}

        {loading && <div>Loading forwards...</div>}

        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
            <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden", height: "fit-content" }}>
              {forwards.map((forward) => (
                <button
                  key={forward.id}
                  onClick={() => setSelectedId(forward.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: selectedId === forward.id ? "#f2f8ff" : "#fff",
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                    padding: 12
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{forward.name}</div>
                  <div style={{ fontSize: 13, marginTop: 4, color: "#333" }}>{forward.description}</div>
                  <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: statusColor(forward.status) }}>
                    {forward.status.toUpperCase()} {forward.pid ? `(pid ${forward.pid})` : ""}
                  </div>
                </button>
              ))}
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14 }}>
              {!selectedForward && <div>Select a port forward.</div>}

              {selectedForward && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedForward.name}</div>
                      <div style={{ fontSize: 13, color: "#AAA", marginTop: 4 }}>
                        Status: <span style={{ color: statusColor(selectedForward.status), fontWeight: 700 }}>{selectedForward.status}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button disabled={busyAction !== null} onClick={() => performAction("start")}>
                        {selectedForward.runMode === "oneshot" ? "Run" : "Start"}
                      </button>
                      {selectedForward.runMode === "persistent" && (
                        <button disabled={busyAction !== null} onClick={() => performAction("restart")}>Restart</button>
                      )}
                      {selectedForward.runMode === "persistent" && (
                        <button disabled={busyAction !== null} onClick={() => performAction("stop")}>Stop</button>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 12, marginBottom: 8, color: "#EEE" }}>
                    <strong>Command:</strong> {selectedForward.command} {selectedForward.args.join(" ")}
                  </div>

                  {awsSsoPrompt && (
                    <div style={{ marginBottom: 12, padding: 10, border: "1px solid #c7d2fe", borderRadius: 8, background: "#101a3c" }}>
                      <div style={{ fontSize: 12, marginBottom: 6 }}>
                        <strong>SSO Device Code:</strong> {awsSsoPrompt.code}
                      </div>
                      <div style={{ fontSize: 12, marginBottom: 8, wordBreak: "break-all" }}>
                        <strong>SSO URL:</strong> {awsSsoPrompt.url}
                      </div>
                      <button onClick={handleAwsSsoAssist}>Copy Code + Open Login Page</button>
                    </div>
                  )}

                  <div
                    style={{
                      background: "#0b1220",
                      color: "#d1e8ff",
                      borderRadius: 8,
                      minHeight: 380,
                      maxHeight: 520,
                      overflow: "auto",
                      padding: 12,
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      fontSize: 12,
                      lineHeight: 1.35
                    }}
                  >
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
          </div>
        )}
      </div>
    </div>
  );
}

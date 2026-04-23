import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  fetchAwsCredentialsFreshness,
  fetchPortForwardLogs,
  fetchPortForwards,
  restartPortForward,
  startPortForward,
  stopPortForward,
  type PortForwardLogEntry,
  type PortForwardSummary
} from "../../../actions/portForwardActions.ts";
import { SOCKET_BASE_URL } from "../../../config.ts";
import { CREDENTIALS_MAX_AGE_HOURS, runStartupSequence, AWS_CREDENTIALS_FORWARD_ID } from "./startupSequence.ts";
import { extractAwsSsoPrompt } from "./utils.ts";

type PortForwardEvent = {
  id: string;
  type: "status" | "log";
  state: PortForwardSummary;
  entry?: PortForwardLogEntry;
};

const MAX_VISIBLE_LOGS = 500;

export function usePortForwardsManager() {
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const [forwards, setForwards] = useState<PortForwardSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [logsById, setLogsById] = useState<Record<string, PortForwardLogEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"start" | "restart" | "stop" | null>(null);
  const [startupBusy, setStartupBusy] = useState(false);
  const [awsCredentialsFresh, setAwsCredentialsFresh] = useState<boolean | null>(null);

  const refreshAwsCredentialsFreshness = async () => {
    try {
      const result = await fetchAwsCredentialsFreshness(CREDENTIALS_MAX_AGE_HOURS);
      setAwsCredentialsFresh(result.isFresh);
    } catch {
      setAwsCredentialsFresh(null);
    }
  };

  const selectedForward = useMemo(
    () => forwards.find((forward) => forward.id === selectedId) ?? null,
    [forwards, selectedId]
  );

  const visibleLogs = selectedId ? logsById[selectedId] || [] : [];
  const awsSsoPrompt = useMemo(() => {
    if (!selectedForward || selectedForward.id !== AWS_CREDENTIALS_FORWARD_ID) {
      return null;
    }

    return extractAwsSsoPrompt(visibleLogs);
  }, [selectedForward, visibleLogs]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const initialForwards = await fetchPortForwards();
        setForwards(initialForwards);
        refreshAwsCredentialsFreshness();

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

      if (
        event.id === AWS_CREDENTIALS_FORWARD_ID &&
        event.type === "status" &&
        (event.state.status === "success" || event.state.status === "error")
      ) {
        refreshAwsCredentialsFreshness();
      }

      if (event.type === "log" && event.entry) {
        const entry = event.entry;
        setLogsById((current) => {
          const existing = current[event.id] || [];
          const nextEntries: PortForwardLogEntry[] = [...existing, entry];
          const merged = nextEntries.slice(-MAX_VISIBLE_LOGS);
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

    await performActionOnForward(selectedForward.id, action);
  };

  const performActionOnForward = async (id: string, action: "start" | "restart" | "stop") => {
    setBusyAction(action);
    setError(null);

    try {
      let result: PortForwardSummary;

      if (action === "start") {
        result = await startPortForward(id);
      } else if (action === "restart") {
        result = await restartPortForward(id);
      } else {
        result = await stopPortForward(id);
      }

      setForwards((current) => current.map((item) => (item.id === result.id ? result : item)));
    } catch (err) {
      setError((err as Error).message || "Failed to run action.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleAwsSsoAssist = async () => {
    if (!awsSsoPrompt) {
      return;
    }

    setError(null);

    // If the complete URL has the code embedded, open it directly — the browser
    // will auto-fill the device code box on the AWS SSO page.
    if (awsSsoPrompt.verificationUriComplete) {
      const opened = window.open(awsSsoPrompt.verificationUriComplete, "_blank", "noopener,noreferrer");
      if (!opened) {
        setError("Pop-up was blocked. Please allow pop-ups for this site.");
      }
      return;
    }

    if (!awsSsoPrompt.code) {
      const opened = window.open(awsSsoPrompt.url, "_blank", "noopener,noreferrer");
      if (!opened) {
        setError("Pop-up was blocked. Please allow pop-ups for this site.");
      }
      return;
    }

    // Fallback: copy the code to clipboard and open the base verification URL.
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

  const handleStartupSequence = async () => {
    setStartupBusy(true);
    setError(null);

    try {
      await runStartupSequence({ onForwardsChange: setForwards });
    } catch (err) {
      setError((err as Error).message || "Failed startup sequence.");
    } finally {
      setStartupBusy(false);
      refreshAwsCredentialsFreshness();
    }
  };

  return {
    forwards,
    selectedId,
    selectedForward,
    visibleLogs,
    awsSsoPrompt,
    awsCredentialsFresh,
    loading,
    error,
    busyAction,
    startupBusy,
    setSelectedId,
    performAction,
    performActionOnForward,
    handleAwsSsoAssist,
    handleStartupSequence
  };
}

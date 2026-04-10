import { apiUrl } from "../config.ts";
import { isServerError, parseApiResponse } from "./apiClient.ts";

export type PortForwardSummary = {
  id: string;
  name: string;
  description: string;
  command: string;
  args: string[];
  status: "idle" | "starting" | "running" | "stopped" | "error";
  pid: number | null;
  lastStartedAt: string | null;
  lastExitedAt: string | null;
  exitCode: number | null;
  errorMessage: string | null;
  updatedAt: string;
};

export type PortForwardLogEntry = {
  id: number;
  timestamp: string;
  stream: "stdout" | "stderr" | "system";
  message: string;
};

function ensureSuccess<T>(value: T | { error: string }): T {
  if (isServerError(value)) {
    throw new Error(value.error);
  }

  return value;
}

export async function fetchPortForwards(): Promise<PortForwardSummary[]> {
  const response = await fetch(apiUrl("/portForwards"));
  const data = await parseApiResponse<{ data: PortForwardSummary[] }>(response);
  return ensureSuccess(data).data;
}

export async function fetchPortForwardLogs(id: string, limit = 500): Promise<PortForwardLogEntry[]> {
  const response = await fetch(apiUrl(`/portForwards/${id}/logs?limit=${limit}`));
  const data = await parseApiResponse<{ data: PortForwardLogEntry[] }>(response);
  return ensureSuccess(data).data;
}

async function mutatePortForward(id: string, action: "start" | "restart" | "stop"): Promise<PortForwardSummary> {
  const response = await fetch(apiUrl(`/portForwards/${id}/${action}`), {
    method: "POST"
  });

  const data = await parseApiResponse<{ data: PortForwardSummary }>(response);
  return ensureSuccess(data).data;
}

export async function startPortForward(id: string): Promise<PortForwardSummary> {
  return mutatePortForward(id, "start");
}

export async function restartPortForward(id: string): Promise<PortForwardSummary> {
  return mutatePortForward(id, "restart");
}

export async function stopPortForward(id: string): Promise<PortForwardSummary> {
  return mutatePortForward(id, "stop");
}

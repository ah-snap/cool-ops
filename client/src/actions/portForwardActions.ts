import { apiUrl } from "../config.ts";
import type { ServerError } from "../types.t";
import { isServerError, parseApiResponse } from "./apiClient.ts";

export type PortForwardSummary = {
  id: string;
  name: string;
  description: string;
  command: string;
  args: string[];
  runMode: "persistent" | "oneshot";
  status: "idle" | "starting" | "running" | "stopped" | "success" | "error";
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

export type AwsCredentialsFreshness = {
  path: string;
  exists: boolean;
  lastUpdatedAt: string | null;
  maxAgeHours: number;
  isFresh: boolean;
};

function ensureSuccess<T>(value: T | ServerError): T {
  if (isServerError(value)) {
    throw new Error(value.error);
  }

  return value;
}

function unwrapData<T>(value: { data: T } | ServerError): T {
  return ensureSuccess(value).data;
}

export async function fetchPortForwards(): Promise<PortForwardSummary[]> {
  const response = await fetch(apiUrl("/portForwards"));
  const data = await parseApiResponse<{ data: PortForwardSummary[] }>(response);
  return unwrapData(data);
}

export async function fetchPortForwardLogs(id: string, limit = 500): Promise<PortForwardLogEntry[]> {
  const response = await fetch(apiUrl(`/portForwards/${id}/logs?limit=${limit}`));
  const data = await parseApiResponse<{ data: PortForwardLogEntry[] }>(response);
  return unwrapData(data);
}

export async function fetchAwsCredentialsFreshness(maxAgeHours = 8): Promise<AwsCredentialsFreshness> {
  const response = await fetch(apiUrl(`/portForwards/aws-credentials/freshness?maxAgeHours=${maxAgeHours}`));
  const data = await parseApiResponse<{ data: AwsCredentialsFreshness }>(response);
  return unwrapData(data);
}

async function mutatePortForward(id: string, action: "start" | "restart" | "stop"): Promise<PortForwardSummary> {
  const response = await fetch(apiUrl(`/portForwards/${id}/${action}`), {
    method: "POST"
  });

  const data = await parseApiResponse<{ data: PortForwardSummary }>(response);
  return unwrapData(data);
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

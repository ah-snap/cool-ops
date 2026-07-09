import { parseApiResponse } from "./apiClient.ts";
import { apiUrl } from "../config.ts";
import type { ServerError } from "../types.t";

// Data Change Requests live in an external datastore. The client talks to our
// own server which proxies (or currently stubs) that store. Field names match
// the external schema (snake_case timestamps, string enum for status).

export type DataChangeRequestStatus =
    | "Pending"
    | "Confirmed"
    | "In Progress"
    | "Invalid"
    | "Failed";

export const DATA_CHANGE_REQUEST_STATUSES: DataChangeRequestStatus[] = [
    "Pending",
    "Confirmed",
    "In Progress",
    "Invalid",
    "Failed",
];

export interface DataChangeRequest {
    id: string;
    type: string;
    data: string;
    requestor: string;
    status: DataChangeRequestStatus;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface ListDataChangeRequestsResponse {
    items: DataChangeRequest[];
    total: number;
}

export interface ListDataChangeRequestsOptions {
    type?: string;
    status?: DataChangeRequestStatus;
    limit?: number;
    offset?: number;
}

export async function listDataChangeRequests(
    options: ListDataChangeRequestsOptions = {},
): Promise<ListDataChangeRequestsResponse | ServerError> {
    const params = new URLSearchParams();
    if (options.type) params.set("type", options.type);
    if (options.status) params.set("status", options.status);
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.offset !== undefined) params.set("offset", String(options.offset));
    const qs = params.toString();
    const response = await fetch(apiUrl(`/dataChangeRequests${qs ? `?${qs}` : ""}`));
    return parseApiResponse<ListDataChangeRequestsResponse>(response);
}

export async function getDataChangeRequest(
    id: string,
): Promise<DataChangeRequest | ServerError> {
    const response = await fetch(apiUrl(`/dataChangeRequests/${id}`));
    return parseApiResponse<DataChangeRequest>(response);
}

export async function updateDataChangeRequest(
    id: string,
    updates: { status?: DataChangeRequestStatus; notes?: string | null; data?: string; type?: string; },
): Promise<DataChangeRequest | ServerError> {
    const response = await fetch(apiUrl(`/dataChangeRequests/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
    });
    return parseApiResponse<DataChangeRequest>(response);
}

export async function deleteDataChangeRequest(id: string): Promise<void | ServerError> {
    const response = await fetch(apiUrl(`/dataChangeRequests/${id}`), { method: "DELETE" });
    if (response.status === 204) return;
    return parseApiResponse<void>(response);
}

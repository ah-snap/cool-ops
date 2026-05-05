import { parseApiResponse } from "./apiClient.ts";
import { apiUrl } from "../config.ts";
import type { ServerError } from "../types.t";

export type RequestStatus = "pending" | "completed" | "failed" | "invalid";
export type RequestType = "whiteLabel";

export interface WhiteLabelRequestPayload {
    requestDate?: string;
    sCode?: string;
    licenseType?: string;
    mac?: string;
}

export interface StoredRequest<TPayload = unknown, TResult = unknown> {
    id: string;
    type: RequestType;
    status: RequestStatus;
    createdAt: string;
    updatedAt: string;
    payload: TPayload;
    result?: TResult;
    error?: string;
}

export interface ListRequestsResponse<TPayload = unknown> {
    items: StoredRequest<TPayload>[];
    total: number;
}

export interface ListRequestsOptions {
    type?: RequestType;
    status?: RequestStatus;
    limit?: number;
    offset?: number;
}

export async function listRequests(
    options: ListRequestsOptions = {},
): Promise<ListRequestsResponse<WhiteLabelRequestPayload> | ServerError> {
    const params = new URLSearchParams();
    if (options.type) params.set("type", options.type);
    if (options.status) params.set("status", options.status);
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.offset !== undefined) params.set("offset", String(options.offset));

    const qs = params.toString();
    const response = await fetch(apiUrl(`/requests${qs ? `?${qs}` : ""}`));
    return parseApiResponse<ListRequestsResponse<WhiteLabelRequestPayload>>(response);
}

export async function getRequest(
    id: string,
): Promise<StoredRequest<WhiteLabelRequestPayload> | ServerError> {
    const response = await fetch(apiUrl(`/requests/${id}`));
    return parseApiResponse<StoredRequest<WhiteLabelRequestPayload>>(response);
}

export async function updateRequest(
    id: string,
    updates: { status?: RequestStatus; result?: unknown; error?: string },
): Promise<StoredRequest<WhiteLabelRequestPayload> | ServerError> {
    const response = await fetch(apiUrl(`/requests/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
    });
    return parseApiResponse<StoredRequest<WhiteLabelRequestPayload>>(response);
}

export async function deleteRequest(id: string): Promise<void | ServerError> {
    const response = await fetch(apiUrl(`/requests/${id}`), { method: "DELETE" });
    if (response.status === 204) return;
    return parseApiResponse<void>(response);
}

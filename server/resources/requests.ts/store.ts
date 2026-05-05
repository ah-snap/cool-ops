import { randomUUID } from "crypto";

export type RequestType = "whiteLabel";
export type RequestStatus = "pending" | "completed" | "failed" | "invalid";

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

export interface ListOptions {
    type?: RequestType;
    status?: RequestStatus;
    limit?: number;
    offset?: number;
}

const requests = new Map<string, StoredRequest>();

export function createRequest<TPayload>(type: RequestType, payload: TPayload): StoredRequest<TPayload> {
    const now = new Date().toISOString();
    const record: StoredRequest<TPayload> = {
        id: randomUUID(),
        type,
        status: "pending",
        createdAt: now,
        updatedAt: now,
        payload,
    };
    requests.set(record.id, record as StoredRequest);
    return record;
}

export function updateRequest(
    id: string,
    updates: Partial<Pick<StoredRequest, "status" | "result" | "error">>,
): StoredRequest | undefined {
    const existing = requests.get(id);
    if (!existing) return undefined;
    const updated: StoredRequest = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
    };
    requests.set(id, updated);
    return updated;
}

export function getRequest(id: string): StoredRequest | undefined {
    return requests.get(id);
}

export function listRequests(options: ListOptions = {}): { items: StoredRequest[]; total: number; } {
    const { type, status, limit, offset = 0 } = options;
    let items = Array.from(requests.values());
    if (type) items = items.filter(r => r.type === type);
    if (status) items = items.filter(r => r.status === status);
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = items.length;
    if (typeof limit === "number") items = items.slice(offset, offset + limit);
    else if (offset) items = items.slice(offset);
    return { items, total };
}

export function deleteRequest(id: string): boolean {
    return requests.delete(id);
}

export function clearRequests(): void {
    requests.clear();
}

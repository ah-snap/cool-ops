// HTTP client for the external Data Change Requests service.
//
// Auth: `Authorization: Bearer <REQUESTS_API_KEY>`.
// Base URL comes from `REQUESTS_URL` (e.g. http://host/requests) — it already
// includes the `/requests` path, so we append `/:id` for by-id operations and
// use it directly for list/create.
//
// The external endpoint returns a raw array on list; we wrap it in
// `{ items, total }` so the client contract mirrors the whiteLabel requests API.

export type DataChangeRequestStatus =
    | "Pending"
    | "Confirmed"
    | "In Progress"
    | "Invalid"
    | "Failed";

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

export interface ListOptions {
    type?: string;
    status?: DataChangeRequestStatus;
    limit?: number;
    offset?: number;
}

function config(): { url: string; apiKey: string } {
    const url = process.env.REQUESTS_URL;
    const apiKey = process.env.REQUESTS_API_KEY;
    if (!url) throw new Error("REQUESTS_URL environment variable is not set");
    if (!apiKey) throw new Error("REQUESTS_API_KEY environment variable is not set");
    return { url: url.replace(/\/+$/, ""), apiKey };
}

function authHeaders(): Record<string, string> {
    const { apiKey } = config();
    return {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
    };
}

async function readError(response: Response): Promise<string> {
    let bodyText = "";
    try {
        bodyText = await response.text();
    } catch {
        // ignore
    }
    return `Upstream ${response.status} ${response.statusText}${bodyText ? `: ${bodyText}` : ""}`;
}

async function parseJson<T>(response: Response): Promise<T> {
    if (!response.ok) throw new Error(await readError(response));
    return (await response.json()) as T;
}

export async function listRequests(options: ListOptions = {}): Promise<{ items: DataChangeRequest[]; total: number; }> {
    const { url } = config();
    const response = await fetch(url, { method: "GET", headers: authHeaders() });
    const raw = await parseJson<DataChangeRequest[] | { items: DataChangeRequest[]; total?: number }>(response);

    let items: DataChangeRequest[] = Array.isArray(raw) ? raw : (raw.items ?? []);

    // The upstream may not filter server-side; apply the requested filters
    // locally so the UI behaves consistently.
    if (options.type) {
        const target = options.type.toLowerCase();
        items = items.filter(r => r.type?.toLowerCase() === target);
    }
    if (options.status) {
        items = items.filter(r => r.status === options.status);
    }
    items.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    const total = items.length;
    const offset = options.offset ?? 0;
    if (typeof options.limit === "number") {
        items = items.slice(offset, offset + options.limit);
    } else if (offset) {
        items = items.slice(offset);
    }
    return { items, total };
}

export async function getRequest(id: string): Promise<DataChangeRequest | undefined> {
    const { url } = config();
    const response = await fetch(`${url}/${encodeURIComponent(id)}`, { method: "GET", headers: authHeaders() });
    if (response.status === 404) return undefined;
    return parseJson<DataChangeRequest>(response);
}

export async function createRequest(input: {
    type: string;
    data: string;
    requestor: string;
    notes?: string | null;
    status?: DataChangeRequestStatus;
}): Promise<DataChangeRequest> {
    const { url } = config();
    const response = await fetch(url, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    return parseJson<DataChangeRequest>(response);
}

export async function updateRequest(
    id: string,
    updates: Partial<Pick<DataChangeRequest, "status" | "notes" | "data" | "type">>,
): Promise<DataChangeRequest | undefined> {
    const { url } = config();
    const response = await fetch(`${url}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(updates),
    });
    if (response.status === 404) return undefined;
    return parseJson<DataChangeRequest>(response);
}

export async function deleteRequest(id: string): Promise<boolean> {
    const { url } = config();
    const response = await fetch(`${url}/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    if (response.status === 404) return false;
    if (!response.ok) throw new Error(await readError(response));
    return true;
}

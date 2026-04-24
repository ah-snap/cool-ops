import { apiUrl } from "../config.ts";
import { parseApiResponse } from "./apiClient.ts";
import type { ServerError, UserRow } from "../types.t";

export async function lookupUsers(emailOrMac: string): Promise<UserRow[] | ServerError> {
    const response = await fetch(apiUrl(`/users/${encodeURIComponent(emailOrMac)}`));
    const data = await parseApiResponse<UserRow[]>(response);
    return data ?? [];
}

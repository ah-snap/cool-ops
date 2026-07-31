import type { ServerError } from "../types.t";
import { parseApiResponse, isServerError } from "./apiClient.ts";
import { apiUrl } from "../config.ts";

export interface SettingResponse {
    id: string;
    key: string;
    secure: boolean;
    value: unknown;
}

export async function fetchSettings(): Promise<SettingResponse[]> {
    const response = await fetch(apiUrl("/settings"));
    const data = await parseApiResponse<SettingResponse[]>(response);
    if (isServerError(data)) {
        throw new Error(data.error);
    }
    return data;
}

export async function updateSetting(key: string, value: unknown): Promise<SettingResponse> {
    const response = await fetch(apiUrl(`/settings/${encodeURIComponent(key)}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
    });
    const data = await parseApiResponse<SettingResponse>(response);
    if (isServerError(data)) {
        throw new Error(data.error);
    }
    return data;
}

export interface ExportedSetting {
    key: string;
    value: unknown;
}

// Real (unmasked) values, gated by the shared SETTINGS_EXPORT_SECRET. Only
// call this from an explicit user-initiated export action.
export async function exportSettings(secret: string, keys?: string[]): Promise<ExportedSetting[]> {
    const params = new URLSearchParams({ secret });
    if (keys && keys.length > 0) {
        params.set("keys", keys.join(","));
    }

    const response = await fetch(apiUrl(`/settings/export?${params.toString()}`));
    const data = await parseApiResponse<ExportedSetting[]>(response);
    if (isServerError(data)) {
        throw new Error(data.error);
    }
    return data;
}

export type { ServerError };

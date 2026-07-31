import * as repository from "./repository.ts";
import type { ExportedSetting, SettingResponse, SettingRow } from "./dtos.ts";

const MASK_PREFIX = "****";
const REVEAL_LENGTH = 4;

// Partial-reveal mask: "****" + last 4 characters (e.g. "****ab12"). Values
// shorter than the reveal length are fully masked so nothing leaks. Always
// has more than 2 asterisks so the client's "don't re-save a censored value"
// guard (see useServerStoredSettings) recognizes it as untouched.
function maskValue(value: unknown): unknown {
    if (typeof value !== "string") {
        return MASK_PREFIX;
    }

    if (value.length === 0) {
        return "";
    }

    if (value.length <= REVEAL_LENGTH) {
        return "*".repeat(value.length);
    }

    return `${MASK_PREFIX}${value.slice(-REVEAL_LENGTH)}`;
}

export function isLikelyMaskedValue(value: unknown): boolean {
    if (typeof value !== "string") return false;
    const asteriskCount = (value.match(/\*/g) || []).length;
    return asteriskCount > 2;
}

function toSettingResponse(row: SettingRow): SettingResponse {
    return {
        id: row.id,
        key: row.key,
        secure: row.secure,
        value: row.secure ? maskValue(row.value) : row.value,
    };
}

export async function listSettings(): Promise<SettingResponse[]> {
    const rows = await repository.getAllSettings();
    return rows.map(toSettingResponse);
}

export async function getSetting(key: string): Promise<SettingResponse | null> {
    const row = await repository.getSettingByKey(key);
    return row ? toSettingResponse(row) : null;
}

// Deliberately bypasses maskValue() — this is the one place real secret
// values leave the server, gated by the caller checking the export secret
// before calling this (see controller.exportSettings).
export async function exportSettings(keys?: string[]): Promise<ExportedSetting[]> {
    const rows = keys && keys.length > 0 ? await repository.getSettingsByKeys(keys) : await repository.getAllSettings();
    return rows.map((row) => ({ key: row.key, value: row.value }));
}

export async function updateSetting(key: string, value: unknown): Promise<SettingResponse | null> {
    const existing = await repository.getSettingByKey(key);
    if (!existing) {
        return null;
    }

    // Defense in depth: mirror the client-side guard so a stale/censored
    // value can't overwrite a real secret even if a buggy/older client sends
    // one back unchanged.
    if (existing.secure && isLikelyMaskedValue(value)) {
        return toSettingResponse(existing);
    }

    const updated = await repository.updateSettingValue(key, value);
    return updated ? toSettingResponse(updated) : null;
}

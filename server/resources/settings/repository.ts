import { getSettingsPool } from "../../common/settingsPostgres.ts";
import type { SettingRow } from "./dtos.ts";

export async function getAllSettings(): Promise<SettingRow[]> {
    const pool = getSettingsPool();
    const result = await pool.query("SELECT id, key, secure, value FROM settings ORDER BY key");
    return result.rows as SettingRow[];
}

export async function getSettingByKey(key: string): Promise<SettingRow | null> {
    const pool = getSettingsPool();
    const result = await pool.query("SELECT id, key, secure, value FROM settings WHERE key = $1", [key]);
    return (result.rows[0] as SettingRow) ?? null;
}

export async function getSettingsByKeys(keys: string[]): Promise<SettingRow[]> {
    const pool = getSettingsPool();
    const result = await pool.query("SELECT id, key, secure, value FROM settings WHERE key = ANY($1) ORDER BY key", [keys]);
    return result.rows as SettingRow[];
}

export async function updateSettingValue(key: string, value: unknown): Promise<SettingRow | null> {
    const pool = getSettingsPool();
    const result = await pool.query(
        `UPDATE settings
         SET value = $2::jsonb, updated_at = now()
         WHERE key = $1
         RETURNING id, key, secure, value`,
        [key, JSON.stringify(value)]
    );
    return (result.rows[0] as SettingRow) ?? null;
}

import { getSettingsPool } from "./settingsPostgres.ts";

// Thin read-through accessor other server modules use instead of reading
// `process.env` directly, so edits made on the Settings page take effect on
// the next request without a restart. Falls back to `process.env[key]` (the
// legacy .env-driven value) if the settings store is unreachable or the key
// hasn't been migrated in yet, so a fresh checkout without the settings-db
// running yet still boots.
export async function getSettingValue(key: string): Promise<string | undefined> {
    try {
        const pool = getSettingsPool();
        const result = await pool.query("SELECT value FROM settings WHERE key = $1", [key]);
        if (result.rows.length) {
            const { value } = result.rows[0] as { value: unknown };
            if (value !== null && value !== undefined) {
                return typeof value === "string" ? value : String(value);
            }
        }
    } catch (err) {
        console.error(`Failed to read setting "${key}" from settings store; falling back to process.env.`, err);
    }

    return process.env[key];
}

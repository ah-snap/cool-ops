import { getSettingsPool } from "../../common/settingsPostgres.ts";
import * as createSettingsTable from "./migrations/001_create_settings_table.ts";

interface Migration {
    id: string;
    up: (client: import("pg").PoolClient) => Promise<void>;
}

const migrations: Migration[] = [createSettingsTable];

export async function runSettingsMigrations(): Promise<void> {
    const pool = getSettingsPool();
    const client = await pool.connect();

    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id varchar(255) PRIMARY KEY,
                applied_at timestamptz NOT NULL DEFAULT now()
            )
        `);

        for (const migration of migrations) {
            const { rows } = await client.query("SELECT 1 FROM schema_migrations WHERE id = $1", [migration.id]);
            if (rows.length) continue;

            await client.query("BEGIN");
            try {
                await migration.up(client);
                await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [migration.id]);
                await client.query("COMMIT");
                console.log(`Applied settings migration: ${migration.id}`);
            } catch (err) {
                await client.query("ROLLBACK");
                throw err;
            }
        }
    } finally {
        client.release();
    }
}

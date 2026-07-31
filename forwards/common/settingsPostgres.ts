import { Pool } from "pg";

// Dedicated Postgres instance for the `settings` datastore, shared with the
// `server` container. Reached directly over the compose network (no SSH/SSM
// forwarding) via SETTINGS_DB_*.
let pool: Pool | null = null;

export function getSettingsPool(): Pool {
    if (!pool) {
        pool = new Pool({
            user: process.env.SETTINGS_DB_USER,
            password: process.env.SETTINGS_DB_PASSWORD,
            host: process.env.SETTINGS_DB_HOST || "localhost",
            port: Number(process.env.SETTINGS_DB_PORT || 5432),
            database: process.env.SETTINGS_DB_NAME,
        });
        pool.on("error", (err) => {
            console.error("Unexpected settings-db pool error:", err);
        });
    }

    return pool;
}

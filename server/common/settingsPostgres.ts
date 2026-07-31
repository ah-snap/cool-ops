import { Pool } from "pg";

// Dedicated Postgres instance for the `settings` datastore. This is
// intentionally separate from the SNOWDB "pg" credentials (PGUSER/PGPASSWORD/
// PGHOST/PGPORT/PGDATABASE) used elsewhere in the server — those refer to the
// Snow subscription database reached through the `forwards` sibling
// container. This settings database is a plain container on the compose
// network (no SSH/SSM forwarding), reached via SETTINGS_DB_*.
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

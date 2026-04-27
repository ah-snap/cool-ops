import sql from "mssql";

function buildSqlConfig() {
    return {
        user: process.env.security16User,
        password: process.env.security16Password,
        database: process.env.security16Database,
        driver: 'tedious',
        port: Number(process.env.security16Port || 1433),
        server: process.env.security16Host || 'localhost',
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
            createRetryIntervalMillis: 2000,
        },
        trustedConnection: true,
        connectionRetryInterval: 5000,
        options: {
            trustedConnection: true,
            trustServerCertificate: true,
            connectionRetryInterval: 5000,
        }
    };
}

type Pool = Awaited<ReturnType<typeof sql.connect>>;

let cachedPool: Pool | null = null;
let pendingConnect: Promise<Pool> | null = null;
let errorHandlerAttached = false;

function isFatalConnectionError(err: unknown): boolean {
    const error = err as NodeJS.ErrnoException & { originalError?: NodeJS.ErrnoException };
    const code = error?.code || error?.originalError?.code || "";
    const message = (error?.message || "").toLowerCase();

    if (["ECONNRESET", "ECONNREFUSED", "EPIPE", "ETIMEDOUT", "ENETUNREACH", "EHOSTUNREACH", "ESOCKET"].includes(code)) {
        return true;
    }

    if (
        message.includes("socket hang up") ||
        message.includes("connection is closed") ||
        message.includes("connection closed") ||
        message.includes("not connected") ||
        message.includes("connection lost")
    ) {
        return true;
    }

    return false;
}

async function resetPool(): Promise<void> {
    const stale = cachedPool;
    cachedPool = null;
    errorHandlerAttached = false;
    try {
        if (stale) {
            await stale.close();
        } else {
            // Fall back to the mssql global in case something outside this
            // module opened a connection.
            await sql.close();
        }
    } catch {
        // Best-effort — the pool may already be torn down.
    }
}

export async function connect(): Promise<Pool> {
    if (cachedPool && cachedPool.connected) {
        return cachedPool;
    }

    if (pendingConnect) {
        return pendingConnect;
    }

    pendingConnect = (async () => {
        const config = buildSqlConfig();
        console.log("Attempting to connect to SQL Server:", {
            server: config.server,
            port: config.port,
            database: config.database
        });
        try {
            // Using sql.connect() (not new ConnectionPool) sets the mssql
            // global pool, which repositories rely on when they construct
            // `new sql.Request()` without an explicit pool.
            const pool = await sql.connect(config);
            if (!errorHandlerAttached) {
                pool.on("error", (err) => {
                    console.error("SQL Server pool error:", err);
                    if (isFatalConnectionError(err)) {
                        void resetPool();
                    }
                });
                errorHandlerAttached = true;
            }
            cachedPool = pool;
            console.log("Connected to SQL Server");
            return pool;
        } catch (err) {
            console.error("SQL Server connection error:", err);
            cachedPool = null;
            throw err;
        } finally {
            pendingConnect = null;
        }
    })();

    return pendingConnect;
}

/**
 * Run an operation against the Security_16 pool, recycling the pool and
 * retrying once if the first attempt fails with a connection-level error
 * (e.g. the port-forward was recycled overnight).
 *
 * Callers can ignore the pool argument and keep using `new sql.Request()`
 * inside their repository functions — `connect()` also sets the mssql
 * global pool.
 */
export async function withPool<T>(fn: (pool: Pool) => Promise<T>): Promise<T> {
    const pool = await connect();
    try {
        return await fn(pool);
    } catch (err) {
        if (!isFatalConnectionError(err)) {
            throw err;
        }

        console.warn("SQL Server connection was stale; recycling pool and retrying.", err);
        await resetPool();

        const freshPool = await connect();
        return fn(freshPool);
    }
}
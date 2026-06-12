import { MongoClient, MongoServerSelectionError, MongoNetworkError, MongoTopologyClosedError } from "mongodb";
import { existsSync } from "node:fs";

function getMongoUri(): string {
    const uri = process.env.mongoConnectionString;
    if (!uri) {
        throw new Error("mongoConnectionString is not set");
    }

    const override = process.env.MONGO_PROXY_HOST;
    const isContainer = existsSync("/.dockerenv");

    if (!override && !isContainer) {
        return uri;
    }

    try {
        const parsed = new URL(uri);
        const currentProxyHost = parsed.searchParams.get("proxyHost");

        if (override) {
            parsed.searchParams.set("proxyHost", override);
            return parsed.toString();
        }

        if (isContainer && currentProxyHost === "localhost") {
            parsed.searchParams.set("proxyHost", "127.0.0.1");
            return parsed.toString();
        }
    } catch {
        // Keep original value if parsing fails.
    }

    return uri;
}

// Cache a single MongoClient process-wide. The driver internally monitors the
// replica-set topology and re-routes operations when the primary changes, so
// reusing one client is the recommended pattern. Previously a new MongoClient
// was created on every call, which leaked connections and -- once enough stale
// clients accumulated or SRV polling drifted -- caused "Server selection timed
// out" errors after the primary shard failed over, only resolved by restarting
// the process.

let clientPromise: Promise<MongoClient> | null = null;

function isFatalConnectionError(err: unknown): boolean {
    return (
        err instanceof MongoServerSelectionError ||
        err instanceof MongoNetworkError ||
        err instanceof MongoTopologyClosedError
    );
}

async function createClient(): Promise<MongoClient> {
    const uri = getMongoUri();
    const mongoClient = new MongoClient(uri, {
        // Reasonable timeouts so a transient failover doesn't hang requests forever.
        serverSelectionTimeoutMS: 15_000,
        // Drop the cached client if the topology closes for any reason.
    });

    mongoClient.on("topologyClosed", () => {
        if (clientPromise) {
            clientPromise = null;
        }
    });

    try {
        return await mongoClient.connect();
    } catch (err) {
        // Make sure we don't keep a broken promise cached.
        clientPromise = null;
        try { await mongoClient.close(true); } catch { /* ignore */ }
        throw err;
    }
}

export async function connect(): Promise<MongoClient> {
    if (!clientPromise) {
        clientPromise = createClient();
    }

    try {
        return await clientPromise;
    } catch (err) {
        if (isFatalConnectionError(err)) {
            // Force re-creation on next call.
            clientPromise = null;
        }
        throw err;
    }
}

async function resetClient(): Promise<void> {
    const stale = clientPromise;
    clientPromise = null;
    if (!stale) return;
    try {
        const client = await stale;
        await client.close(true);
    } catch {
        // ignore — the client is being discarded anyway.
    }
}

/**
 * Run an operation against the cached MongoClient, recycling the client and
 * retrying once if the first attempt fails with a connection-level error.
 *
 * Needed because the SRV-routed-through-SOCKS topology can get stuck after an
 * Atlas failover or once the SSH tunnel in the forwards container goes stale
 * (e.g. after days of uptime). When that happens `MongoServerSelectionError`
 * is thrown during operations like `findOne`, but the cached client's
 * topology never closes on its own, so without an explicit recycle every
 * subsequent request keeps failing until the server process is restarted.
 *
 * Mirrors the `withPool` pattern in `security16.ts`.
 */
export async function withMongo<T>(fn: (client: MongoClient) => Promise<T>): Promise<T> {
    const client = await connect();
    try {
        return await fn(client);
    } catch (err) {
        if (!isFatalConnectionError(err)) {
            throw err;
        }

        console.warn("MongoDB connection was stale; recycling client and retrying.", err);
        await resetClient();

        const freshClient = await connect();
        return fn(freshClient);
    }
}

export async function closeConnection(): Promise<void> {
    await resetClient();
}
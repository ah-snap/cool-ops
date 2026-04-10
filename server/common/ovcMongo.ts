import { MongoClient } from "mongodb";
import { existsSync } from "node:fs";

function getMongoUri(): string {
    const uri = process.env.mongoConnectionString;
    if (!uri) {
        throw new Error("mongoConnectionString is not set");
    }

    const isContainer = existsSync("/.dockerenv");
    if (!isContainer) {
        return uri;
    }

    try {
        const parsed = new URL(uri);
        if (parsed.searchParams.get("proxyHost") === "localhost") {
            parsed.searchParams.set("proxyHost", "127.0.0.1");
            return parsed.toString();
        }
    } catch {
        // Keep original value if parsing fails.
    }

    return uri;
}

export async function connect() {
    const uri = getMongoUri();
    const mongoClient = new MongoClient(uri);
    return await mongoClient.connect();
}
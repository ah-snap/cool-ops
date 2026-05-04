import { existsSync } from "node:fs";

export function getPgHost(): string {
  const host = process.env.PGHOST || "localhost";

  const isContainer = existsSync("/.dockerenv");
  if (!isContainer) {
    return host;
  }

  // Inside the api container, Postgres is reached through the `forwards`
  // sibling service (which runs the SSH port forward). Map common loopback
  // aliases that may leak in from a developer .env to that service so the
  // connection doesn't try to dial 127.0.0.1:5433 inside the api container.
  if (host === "localhost" || host === "127.0.0.1" || host === "host.docker.internal") {
    return "forwards";
  }

  return host;
}

export function getPgPort(): number {
  return Number(process.env.PGPORT || 5433);
}

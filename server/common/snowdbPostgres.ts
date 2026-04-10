import { existsSync } from "node:fs";

export function getPgHost(): string {
  const host = process.env.PGHOST || "localhost";

  const isContainer = existsSync("/.dockerenv");
  if (!isContainer) {
    return host;
  }

  if (host === "localhost" || host === "host.docker.internal") {
    return "127.0.0.1";
  }

  return host;
}

export function getPgPort(): number {
  return Number(process.env.PGPORT || 5433);
}

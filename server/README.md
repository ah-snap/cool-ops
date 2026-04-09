# server-bun

Bun + TypeScript copy of the original `server` folder.

## Environment

Copy `.env.example` to `.env` and populate required secrets before running.

When running inside Docker Compose, defaults are set to reach host-forwarded services via `host.docker.internal`.

## Setup

1. Install dependencies:

```bash
bun install
```

2. Run in watch mode:

```bash
bun run dev
```

3. Run once:

```bash
bun run start
```

4. Type check:

```bash
bun run typecheck
```

## Docker

Build and run from the repository root:

```bash
docker compose up --build
```

# cool-ops

## Docker Compose Workflow (Recommended)

This repository is set up so future engineers can run the app stack with Docker Compose after adding secrets.

### 1. Start required port-forwards first

The app still depends on external data sources that must be reachable from your machine:

- Security_16 SQL Server on local port `1433`
- Mongo SOCKS proxy on local port `9925`
- SnowDB/Postgres on local port `5433` (if used in your flow)

Security_16 example (`prod_access` profile):

```bash
aws ssm start-session --region us-east-2 --target i-03c11f3bcfd51b0d9 \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters host="10.201.1.20",portNumber="1433",localPortNumber="1433" \
    --profile prod_access
```

Note for the new Manage Port Forwards page: the command is launched by the API process.
If API runs in Docker, the container must have both `aws` CLI and Session Manager Plugin available, plus access to host AWS credentials
(for example by mounting `~/.aws` into the container). If API runs directly on the host, it uses the host setup as-is.

For Docker usage, one practical option is to mount your AWS credentials/config into the API service, for example on Windows:

```yaml
services:
    api:
        volumes:
            - ${USERPROFILE}/.aws:/root/.aws:rw
```

Then rebuild the API container after Dockerfile changes:

```bash
docker compose -f docker-compose.dev.yml build api
docker compose -f docker-compose.dev.yml up -d api
```

You can verify the profile is visible inside the API container with:

```bash
docker compose -f docker-compose.dev.yml exec api aws configure list-profiles
```

Mongo SOCKS example (`ovrc_prod_ssm` profile + `prodovrckey.pem`):

```bash
ssh -i ~/.ssh/prodovrckey.pem -N -o \
    ProxyCommand='aws ssm start-session \
        --target "i-0b948dc3e42999200" \
        --profile ovrc_prod_ssm \
        --document-name AWS-StartSSHSession \
        --parameters portNumber=22 \
        --region us-east-1' \
    ubuntu@localhost -D 9925
```

### 2. Create env files

Create `server/.env` from `server/.env.example` and populate secrets.

Optionally create root `.env` from `.env.compose.example` if you want to override compose defaults.

### 3. Run with compose

```bash
docker compose up --build
```

Endpoints:

- Client: `http://localhost:3000`
- API: `http://localhost:3003/api`

## Docker Compose Dev Hot Reload

Use this mode when actively editing code and you want changes to apply without rebuilding images.

```bash
docker compose -f docker-compose.dev.yml up --build
```

Endpoints in dev mode:

- Client (Vite): `http://localhost:5173`
- API: `http://localhost:3003/api`

How it works:

- Both `client` and `server` are bind-mounted into their containers.
- Frontend runs `vite` in dev mode with HMR.
- Backend runs `bun --watch` via `bun run dev`.
- Frontend dependencies are installed into a named Docker volume only when that volume is empty or `package-lock.json` changes.

## Manual Local Workflow (Legacy)

If you are not using compose, you can still run locally.

Starting server:

```bash
cd ./server
npm start
```

Starting client:

```bash
cd ./client
npm start
```

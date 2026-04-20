# cool-ops

## Development Startup

This project is intended to be run with the dev Docker Compose workflow in [docker-compose.dev.yml](docker-compose.dev.yml).

The dev stack provides:

- Vite frontend with hot reload on `http://localhost:5173`
- API server on `http://localhost:3003/api`
- Dockerized runtime with your local source bind-mounted into the containers

## Environment Assumptions

Before you start, this setup assumes the following already exist on your machine:

- Docker Desktop is installed and running
- `~/.aws` is configured with the AWS profiles you use for SSO and port forwarding
- `~/.kube/config` exists if you plan to use the Kubernetes license-service port forward
- Your AWS SSO access works from the host machine
- You have the `prodovrckey.pem` and `snowdb.pem` private keys available

The dev compose file mounts these host locations into the `api` container:

- `${HOME:-${USERPROFILE}}/.aws` -> `/root/.aws`
- `${HOME:-${USERPROFILE}}/.kube` -> `/root/.kube`
- `./prodovrckey.pem` -> `/run/keys/prodovrckey.pem`
- `./snowdb.pem` -> `/run/keys/snowdb.pem`

On macOS and Linux, `HOME` is used automatically. On Windows, Compose falls back to `USERPROFILE`.

If those files or folders are missing, the Manage Port Forwards page will not work correctly.

## First-Time Setup

### 1. Clone the repository

If you are reading this in the repo already, you have probably already done this.

### 2. Create the root `.env`

Copy the template and then edit the new file:

```bash
cp .env.example .env
```

### 3. Populate the required `.env` values

At minimum, fill in these values in `.env`.

#### Mongo

- `mongoConnectionString`

Most users can copy this directly from MongoDB Compass.

#### Security_16

- `security16User`
- `security16Password`
- `security16Database` if you need something other than the default

`security16Host` should usually stay `localhost` when you are using the local port forward.

#### SnowDB

- `PGPASSWORD`
- `PGUSER` if your local credentials differ from the default
- `PGDATABASE` if needed

`PGHOST` should usually stay `host.docker.internal` in Docker so the container can reach the forwarded port running on the host.

#### AWS login profile

- `PORT_FORWARD_AWS_SSO_LOGIN_PROFILE`
- `PORT_FORWARD_AWS_SSO_USE_DEVICE_CODE`

This is the profile used when the app runs `aws sso login` from the Manage Port Forwards page.

Set `PORT_FORWARD_AWS_SSO_USE_DEVICE_CODE=true` (recommended in Docker/dev containers) to force AWS CLI device-code login, which avoids localhost OAuth callback failures from containerized environments.

To inspect available profiles:

```bash
aws configure list-profiles
```

To inspect whether a profile is configured for SSO:

```bash
aws configure get sso_start_url --profile prod_access_1
aws configure get sso_session --profile prod_access_1
```

If both commands return nothing for a profile, it is probably not the SSO login profile you want.

You can also inspect your config file directly:

```bash
code ~/.aws/config
```

#### AWS profile mappings

- `PORT_FORWARD_AWS_PROFILE_MAPPINGS`

This variable tells the credential refresh script how to map your SSO-backed config profiles to the credential profiles the app expects.

Format:

```text
credentialProfile,configProfile,role,accountId,region;credentialProfile,configProfile,role,accountId,region
```

Current example from [.env.example](.env.example):

```text
prod_access,prod_access,Developer,367507620554,us-east-1;dev_access,dev_access,Developer,489561981168,us-east-1;snap_dev,dev_access,Developer,268853364163,us-east-1;snap_stage,ovrc_stage,Developer,642727902844,us-east-1;ovrc_prod_ssm,prod_access_1,SsmUser,445822975327,us-east-1
```

Use the helper script to generate these values from your configured AWS profiles:

```bash
bash ./scripts/generate-aws-profile-mappings.sh
```

If you want the default choices without prompts:

```bash
bash ./scripts/generate-aws-profile-mappings.sh --use-defaults
```

The script prints `.env`-ready values for:

- `PORT_FORWARD_AWS_SSO_LOGIN_PROFILE`
- `PORT_FORWARD_AWS_PROFILE_MAPPINGS`
- `PORT_FORWARD_AWS_CODEARTIFACT_PROFILE`

#### CodeArtifact profile

- `PORT_FORWARD_AWS_CODEARTIFACT_PROFILE`

This should usually be one of the credential profiles defined in `PORT_FORWARD_AWS_PROFILE_MAPPINGS`.

#### Infrastructure hosts and users

- `SNOWDB_HOST`
- `SECURITY16_FORWARDING_HOST`
- `SNOWDB_FORWARD_USER`

Use the actual values your team expects for your environment.

`SECURITY16_FORWARDING_HOST` is the SQL host that the jumpbox connects to, not the jumpbox itself.

#### Private keys

Copy these files into the project root:

- `prodovrckey.pem`
- `snowdb.pem`

The compose file mounts them into the API container automatically.

## Recommended Verification Before Startup

Run these checks on the host machine before starting the stack:

```bash
aws configure list-profiles
test -f ~/.aws/config
test -f ~/.kube/config
test -f ./prodovrckey.pem
test -f ./snowdb.pem
```

## Start the Dev Stack

From the repository root:

```bash
docker compose -f docker-compose.dev.yml up --build -d
```

Endpoints:

- Client: `http://localhost:5173`
- API: `http://localhost:3003/api`

## Common Follow-Up Commands

Rebuild and restart only the API container:

```bash
docker compose -f docker-compose.dev.yml build api
docker compose -f docker-compose.dev.yml up -d api
```

View API logs:

```bash
docker compose -f docker-compose.dev.yml logs -f api
```

Open a shell in the API container:

```bash
docker compose -f docker-compose.dev.yml exec api bash
```

## Port Forwarding Notes

The Manage Port Forwards page runs the forwarding commands from inside the API container, not from your host shell.

That means successful port forwarding depends on all of the following being true:

- AWS profiles are visible inside the container through the mounted `~/.aws`
- SSH private keys are present in the project root so they mount into `/run/keys`
- `~/.kube/config` exists if you use the Kubernetes forward
- Your `.env` values point at the correct remote systems

If a port forward starts but the destination is wrong, check the corresponding `.env` values first.

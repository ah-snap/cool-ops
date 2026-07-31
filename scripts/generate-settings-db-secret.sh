#!/usr/bin/env bash
# Populates SETTINGS_DB_PASSWORD (and any other missing SETTINGS_DB_* keys)
# in the repo's .env with a randomly generated value, for first-time setup of
# the settings datastore container. Safe to re-run: existing values are left
# alone unless --force is passed.
set -euo pipefail

FORCE=false
if [[ "${1:-}" == "--force" ]]; then
    FORCE=true
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
    echo ".env not found at $ENV_FILE — copy .env.example to .env first." >&2
    exit 1
fi

generate_password() {
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -base64 24 | tr -d '=+/\n'
    else
        # Fallback with no external deps.
        head -c 32 /dev/urandom | base64 | tr -d '=+/\n'
    fi
}

set_or_append_env_var() {
    local key="$1"
    local value="$2"

    if grep -qE "^${key}=" "$ENV_FILE"; then
        local current
        current="$(grep -E "^${key}=" "$ENV_FILE" | head -n1 | cut -d'=' -f2-)"

        if [[ -z "$current" || "$FORCE" == true ]]; then
            # Portable in-place edit for both GNU and BSD/macOS sed.
            sed -i.bak "s|^${key}=.*|${key}=${value}|" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
            echo "Set ${key} in .env"
        else
            echo "${key} already set in .env; leaving it alone (use --force to regenerate)."
        fi
    else
        printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
        echo "Added ${key} to .env"
    fi
}

set_or_append_env_var "SETTINGS_DB_USER" "settings"
set_or_append_env_var "SETTINGS_DB_PASSWORD" "$(generate_password)"
set_or_append_env_var "SETTINGS_DB_NAME" "settings"
set_or_append_env_var "SETTINGS_DB_HOST" "settings-db"
set_or_append_env_var "SETTINGS_DB_PORT" "5432"

echo "Done. Start (or restart) the settings-db and api services to pick up the new credentials."

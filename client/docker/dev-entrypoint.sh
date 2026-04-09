#!/bin/sh
set -eu

cd /app

lock_hash="$(sha256sum package-lock.json | awk '{print $1}')"
current_hash="$(cat node_modules/.package-lock.hash 2>/dev/null || true)"

if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null || true)" ] || [ "$lock_hash" != "$current_hash" ]; then
    echo "Installing client dependencies..."
    npm ci --no-audit --no-fund --prefer-offline --progress=false
    printf '%s' "$lock_hash" > node_modules/.package-lock.hash
fi

exec npm run dev -- --host 0.0.0.0 --port 5173
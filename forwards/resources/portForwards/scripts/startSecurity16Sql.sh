#!/usr/bin/env bash
set -euo pipefail

# Starts `aws ssm start-session` for Security_16 SQL on an internal loopback
# port, then runs socat in the foreground to relay traffic from the
# container-wide listen port (default 1433, bound 0.0.0.0) to the SSM
# loopback port. This keeps the forward reachable both from the sibling
# `api` container (via shared network namespace / 127.0.0.1) and from the
# host machine when compose publishes 1433:1433.
#
# Environment:
#   SECURITY16_FORWARDING_HOST  remote host name used by SSM (default localhost)
#   SECURITY16_PORT             container-side listen port (default 1433)
#   SECURITY16_INTERNAL_PORT    loopback port used between SSM and socat (default 11433)
#   SECURITY16_SSM_TARGET       ssm target instance id
#   PROD_ACCESS_PROFILE         aws profile (default prod_access)

SECURITY16_FORWARDING_HOST="${SECURITY16_FORWARDING_HOST:-localhost}"
SECURITY16_PORT="${SECURITY16_PORT:-1433}"
SECURITY16_INTERNAL_PORT="${SECURITY16_INTERNAL_PORT:-11433}"
SECURITY16_SSM_TARGET="${SECURITY16_SSM_TARGET:-i-03c11f3bcfd51b0d9}"
PROD_ACCESS_PROFILE="${PROD_ACCESS_PROFILE:-prod_access}"
# How often (seconds) to probe the internal port while relay is running.
SECURITY16_HEALTHCHECK_INTERVAL="${SECURITY16_HEALTHCHECK_INTERVAL:-30}"
# How many consecutive probe failures to tolerate before declaring the
# SSM listener dead and exiting.
SECURITY16_HEALTHCHECK_FAILS="${SECURITY16_HEALTHCHECK_FAILS:-3}"

SSM_PID=""
SOCAT_PID=""

cleanup() {
  local pid
  for pid in "$SOCAT_PID" "$SSM_PID"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done

  # Give them a moment, then force if still alive.
  for _ in 1 2 3 4 5; do
    local any_alive=0
    for pid in "$SOCAT_PID" "$SSM_PID"; do
      if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
        any_alive=1
      fi
    done
    [[ "$any_alive" -eq 0 ]] && break
    sleep 0.2
  done

  for pid in "$SOCAT_PID" "$SSM_PID"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill -KILL "$pid" 2>/dev/null || true
    fi
  done
}

trap cleanup EXIT INT TERM

echo "[security16-sql] starting AWS SSM session on 127.0.0.1:${SECURITY16_INTERNAL_PORT} -> ${SECURITY16_FORWARDING_HOST}:1433"
aws ssm start-session \
  --region us-east-2 \
  --target "${SECURITY16_SSM_TARGET}" \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "host=${SECURITY16_FORWARDING_HOST},portNumber=1433,localPortNumber=${SECURITY16_INTERNAL_PORT}" \
  --profile "${PROD_ACCESS_PROFILE}" &
SSM_PID=$!

# Wait for the SSM listener to come up before starting the relay.
for _ in $(seq 1 60); do
  if (echo > /dev/tcp/127.0.0.1/${SECURITY16_INTERNAL_PORT}) >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$SSM_PID" 2>/dev/null; then
    echo "[security16-sql] aws ssm exited before listener was up" >&2
    exit 1
  fi
  sleep 0.5
done

echo "[security16-sql] starting socat relay 0.0.0.0:${SECURITY16_PORT} -> 127.0.0.1:${SECURITY16_INTERNAL_PORT}"
socat TCP-LISTEN:${SECURITY16_PORT},bind=0.0.0.0,fork,reuseaddr TCP:127.0.0.1:${SECURITY16_INTERNAL_PORT} &
SOCAT_PID=$!

# Supervise both children: if either one dies, or the internal SSM
# listener stops accepting connections, exit non-zero so the port-forward
# manager flips the status to red instead of silently serving connection
# refused.
fail_count=0
while :; do
  if ! kill -0 "$SSM_PID" 2>/dev/null; then
    echo "[security16-sql] aws ssm process exited; tearing down relay" >&2
    exit 1
  fi
  if ! kill -0 "$SOCAT_PID" 2>/dev/null; then
    echo "[security16-sql] socat relay exited; tearing down SSM session" >&2
    exit 1
  fi

  if (echo > /dev/tcp/127.0.0.1/${SECURITY16_INTERNAL_PORT}) >/dev/null 2>&1; then
    fail_count=0
  else
    fail_count=$((fail_count + 1))
    echo "[security16-sql] internal SSM listener probe failed (${fail_count}/${SECURITY16_HEALTHCHECK_FAILS})" >&2
    if [[ "$fail_count" -ge "$SECURITY16_HEALTHCHECK_FAILS" ]]; then
      echo "[security16-sql] SSM listener unreachable after ${SECURITY16_HEALTHCHECK_FAILS} probes; exiting" >&2
      exit 1
    fi
  fi

  sleep "${SECURITY16_HEALTHCHECK_INTERVAL}"
done

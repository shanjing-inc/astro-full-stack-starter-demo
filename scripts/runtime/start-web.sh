#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DIST_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
APP_ROOT=$(CDPATH= cd -- "$DIST_DIR/../.." && pwd)
DENO_BIN="${DENO_BIN:-deno}"
PORT="${PORT:-8000}"
SERVER_ENTRY="$DIST_DIR/server/serve.mjs"
QUEUE_PM2_HOME="${QUEUE_PM2_HOME:-/app/.pm2-queue}"
QUEUE_DAEMON_LOG="${QUEUE_DAEMON_LOG:-$QUEUE_PM2_HOME/start-queue-daemon.log}"
# Bound the queue bootstrap so a hung pm2 cannot block web forever.
QUEUE_DAEMON_TIMEOUT_SECONDS="${QUEUE_DAEMON_TIMEOUT_SECONDS:-30}"

find_env_file() {
    for candidate in \
        "$DIST_DIR/.env" \
        "$APP_ROOT/.env" \
        "$(pwd)/.env"
    do
        if [ -f "$candidate" ]; then
            printf '%s\n' "$candidate"
            return 0
        fi
    done

    return 1
}

queue_apps_running() {
    PM2_HOME="$QUEUE_PM2_HOME" pm2 jlist 2>/dev/null | grep -q 'queue-'
}

start_queue_daemon_if_enabled() {
    case "${QUEUE:-0}" in
        1|true|TRUE|yes|YES|on|ON)
            mkdir -p "$QUEUE_PM2_HOME"
            echo "[start-web] QUEUE enabled; starting queue daemon (timeout=${QUEUE_DAEMON_TIMEOUT_SECONDS}s, log=$QUEUE_DAEMON_LOG)" >&2

            set +e
            if command -v timeout >/dev/null 2>&1; then
                timeout "$QUEUE_DAEMON_TIMEOUT_SECONDS" "$SCRIPT_DIR/start-queue-daemon.sh" >>"$QUEUE_DAEMON_LOG" 2>&1
                daemon_status=$?
                used_timeout=1
            else
                # Fallback: keep web non-blocking if timeout(1) is unavailable.
                "$SCRIPT_DIR/start-queue-daemon.sh" >>"$QUEUE_DAEMON_LOG" 2>&1 &
                daemon_status=0
                used_timeout=0
            fi
            set -e

            if [ "$used_timeout" -eq 1 ]; then
                if [ "${daemon_status:-0}" -ne 0 ] || ! queue_apps_running; then
                    echo "[start-web] queue daemon did not report healthy PM2 apps (exit=${daemon_status:-n/a}). Last log lines:" >&2
                    tail -n 80 "$QUEUE_DAEMON_LOG" 2>/dev/null >&2 || true
                else
                    echo "[start-web] queue daemon PM2 apps are up" >&2
                fi
            else
                echo "[start-web] queue daemon launched in background (no timeout binary); check $QUEUE_DAEMON_LOG" >&2
            fi
            ;;
        *)
            echo "[start-web] QUEUE=${QUEUE:-0}; skip queue daemon" >&2
            ;;
    esac
}

is_deno_cache_required() {
    case "${DENO_CACHE_REQUIRED:-0}" in
        1|true|TRUE|yes|YES|on|ON)
            return 0
            ;;
    esac

    return 1
}

start_queue_daemon_if_enabled

set -- "$DENO_BIN" serve --parallel --port="$PORT" --no-npm --node-modules-dir=none --allow-net --allow-read --allow-env

if is_deno_cache_required; then
    set -- "$@" --cached-only

    if [ -f "$APP_ROOT/deno.lock" ]; then
        set -- "$@" --lock="$APP_ROOT/deno.lock" --frozen
    fi
fi

if ENV_FILE=$(find_env_file); then
    set -- "$@" --env-file="$ENV_FILE"
fi

exec "$@" "$SERVER_ENTRY"

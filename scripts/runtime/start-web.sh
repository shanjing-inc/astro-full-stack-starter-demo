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

start_queue_daemon_if_enabled() {
    case "${QUEUE:-0}" in
        1|true|TRUE|yes|YES|on|ON)
            mkdir -p "$QUEUE_PM2_HOME"
            "$SCRIPT_DIR/start-queue-daemon.sh" >>"$QUEUE_DAEMON_LOG" 2>&1 &
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

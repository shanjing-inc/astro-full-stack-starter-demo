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
# Bound the queue bootstrap so a hung pm2 cannot block forever.
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
            echo "[start-web] QUEUE enabled; starting queue daemon fail-fast (timeout=${QUEUE_DAEMON_TIMEOUT_SECONDS}s, log=$QUEUE_DAEMON_LOG)" >&2

            set +e
            if command -v timeout >/dev/null 2>&1; then
                timeout "$QUEUE_DAEMON_TIMEOUT_SECONDS" "$SCRIPT_DIR/start-queue-daemon.sh" >>"$QUEUE_DAEMON_LOG" 2>&1
                daemon_status=$?
            else
                # No timeout(1): block until daemon returns. Never fire-and-forget under QUEUE=1.
                "$SCRIPT_DIR/start-queue-daemon.sh" >>"$QUEUE_DAEMON_LOG" 2>&1
                daemon_status=$?
            fi
            set -e

            if [ "${daemon_status:-0}" -ne 0 ] || ! queue_apps_running; then
                echo "[start-web] queue daemon failed (exit=${daemon_status:-n/a}); refuse to start web (fail-fast). Last log lines:" >&2
                tail -n 80 "$QUEUE_DAEMON_LOG" 2>/dev/null >&2 || true
                exit 1
            fi

            echo "[start-web] queue daemon PM2 apps are up; starting web" >&2
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

# DENO_SERVE_PARALLEL: default 0/off (lower RSS). Set 1/true/on to enable multi-thread serve --parallel.
case "${DENO_SERVE_PARALLEL:-0}" in
    1|true|TRUE|yes|YES|on|ON)
        SERVE_PARALLEL_ARGS="--parallel"
        echo "[start-web] DENO_SERVE_PARALLEL=${DENO_SERVE_PARALLEL:-0}; deno serve --parallel" >&2
        ;;
    *)
        SERVE_PARALLEL_ARGS=""
        echo "[start-web] DENO_SERVE_PARALLEL=${DENO_SERVE_PARALLEL:-0}; deno serve without --parallel" >&2
        ;;
esac

# shellcheck disable=SC2086
set -- "$DENO_BIN" serve $SERVE_PARALLEL_ARGS --port="$PORT" --no-npm --node-modules-dir=none --allow-net --allow-read --allow-env

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

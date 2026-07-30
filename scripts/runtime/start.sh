#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
QUEUE_VALUE="${QUEUE:-0}"

log() {
    echo "[start] $*" >&2
}

case "$QUEUE_VALUE" in
    0)
        log "QUEUE=0; role=web-only"
        exec "$SCRIPT_DIR/start-web.sh"
        ;;
    1)
        log "QUEUE=1; role=queue-only"
        exec "$SCRIPT_DIR/start-queue.sh"
        ;;
    2)
        log "QUEUE=2; role=web+queue"
        exec "$SCRIPT_DIR/start-web.sh"
        ;;
    true|TRUE|yes|YES|on|ON)
        log "QUEUE=${QUEUE_VALUE}; deprecated truthy value, treating as QUEUE=2 (web+queue). Prefer QUEUE=2."
        export QUEUE=2
        exec "$SCRIPT_DIR/start-web.sh"
        ;;
    *)
        log "ERROR: invalid QUEUE=${QUEUE_VALUE}. Expected 0 (web), 1 (queue), or 2 (web+queue)."
        exit 2
        ;;
esac

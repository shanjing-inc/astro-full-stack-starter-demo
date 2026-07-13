#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DIST_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PM2_CONFIG="$DIST_DIR/queues/queue.pm2.config.cjs"
PM2_ENV="${PM2_ENV:-production}"
QUEUE_PM2_HOME="${QUEUE_PM2_HOME:-/app/.pm2-queue}"

export PM2_HOME="$QUEUE_PM2_HOME"

log() {
    echo "[queue-daemon] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"
}

if [ "${1:-}" = "--help" ]; then
    cat <<'HELP'
Usage:
  ./start-queue-daemon.sh
  QUEUE_APPS=queue-critical,queue-default ./start-queue-daemon.sh
  QUEUE_APPS=queue-scheduler,queue-critical ./start-queue-daemon.sh

Environment:
  PM2_ENV         PM2 environment name, defaults to production
  QUEUE_PM2_HOME  PM2 home for queue daemon, defaults to /app/.pm2-queue
  QUEUE_APPS      PM2 app names passed to --only, separated by commas
HELP
    exit 0
fi

log "start PM2_HOME=$PM2_HOME PM2_ENV=$PM2_ENV QUEUE_APPS=${QUEUE_APPS:-<all>} config=$PM2_CONFIG"

if [ ! -f "$PM2_CONFIG" ]; then
    log "ERROR: missing PM2 config: $PM2_CONFIG"
    exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
    log "ERROR: pm2 not found in PATH"
    exit 1
fi

if ! command -v node >/dev/null 2>&1; then
    log "ERROR: node not found in PATH (required to load PM2 config)"
    exit 1
fi

# Fail early with a clear message if config cannot be required.
if ! node -e "const c=require(process.argv[1]); if (!c || !Array.isArray(c.apps) || c.apps.length===0) { console.error('[queue-daemon] PM2 config apps is empty'); process.exit(1); } console.log('[queue-daemon] apps=' + c.apps.map((a)=>a.name).join(','));" "$PM2_CONFIG"; then
    log "ERROR: failed to load PM2 config: $PM2_CONFIG"
    exit 1
fi

mkdir -p "$PM2_HOME"

if [ -n "${QUEUE_APPS:-}" ]; then
    log "pm2 startOrReload --only $QUEUE_APPS"
    pm2 startOrReload "$PM2_CONFIG" --env "$PM2_ENV" --only "$QUEUE_APPS"
else
    log "pm2 startOrReload (all apps)"
    pm2 startOrReload "$PM2_CONFIG" --env "$PM2_ENV"
fi

log "done"
pm2 status || true

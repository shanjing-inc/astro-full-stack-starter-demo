#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DIST_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PM2_CONFIG="$DIST_DIR/queues/queue.pm2.config.cjs"
PM2_ENV="${PM2_ENV:-production}"
QUEUE_PM2_HOME="${QUEUE_PM2_HOME:-/app/.pm2-queue}"

export PM2_HOME="$QUEUE_PM2_HOME"

if [ "${1:-}" = "--help" ]; then
    cat <<'EOF'
Usage:
  ./start-queue-daemon.sh
  QUEUE_APPS=queue-critical,queue-default ./start-queue-daemon.sh
  QUEUE_APPS=queue-scheduler,queue-critical ./start-queue-daemon.sh

Environment:
  PM2_ENV         PM2 environment name, defaults to production
  QUEUE_PM2_HOME  PM2 home for queue daemon, defaults to /app/.pm2-queue
  QUEUE_APPS      PM2 app names passed to --only, separated by commas
EOF
    exit 0
fi

mkdir -p "$PM2_HOME"

if [ -n "${QUEUE_APPS:-}" ]; then
    pm2 startOrReload "$PM2_CONFIG" --env "$PM2_ENV" --only "$QUEUE_APPS"
    exit 0
fi

pm2 startOrReload "$PM2_CONFIG" --env "$PM2_ENV"

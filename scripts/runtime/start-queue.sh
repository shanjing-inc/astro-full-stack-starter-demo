#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DIST_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PM2_CONFIG="$DIST_DIR/queues/queue.pm2.config.cjs"
PM2_ENV="${PM2_ENV:-production}"

if [ "${1:-}" = "--help" ]; then
    cat <<'EOF'
Usage:
  ./start-queue.sh
  QUEUE_APPS=queue-critical,queue-default ./start-queue.sh
  QUEUE_APPS=queue-scheduler,queue-critical ./start-queue.sh

Environment:
  PM2_ENV     PM2 environment name, defaults to production
  QUEUE_APPS  PM2 app names passed to --only, separated by commas
EOF
    exit 0
fi

if [ -n "${QUEUE_APPS:-}" ]; then
    exec pm2-runtime start "$PM2_CONFIG" --env "$PM2_ENV" --only "$QUEUE_APPS"
fi

exec pm2-runtime start "$PM2_CONFIG" --env "$PM2_ENV"

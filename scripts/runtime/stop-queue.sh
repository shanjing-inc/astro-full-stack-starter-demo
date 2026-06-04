#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DIST_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PM2_CONFIG="$DIST_DIR/queues/queue.pm2.config.cjs"
QUEUE_PM2_HOME="${QUEUE_PM2_HOME:-/app/.pm2-queue}"

export PM2_HOME="$QUEUE_PM2_HOME"

pm2 delete "$PM2_CONFIG" >/dev/null 2>&1 || true
pm2 kill >/dev/null 2>&1 || true

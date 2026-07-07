#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DENO_BIN="${DENO_BIN:-deno}"

exec "$DENO_BIN" run \
    --no-npm \
    --node-modules-dir=none \
    --allow-env \
    --allow-read \
    --allow-net \
    --lock="$SCRIPT_DIR/deno.lock" \
    --frozen \
    "$SCRIPT_DIR/migrate.mjs" \
    "$@"

#!/bin/sh
set -eu

SCRIPT_PATH=$0

while [ -L "$SCRIPT_PATH" ] && command -v readlink >/dev/null 2>&1; do
    LINK_TARGET=$(readlink "$SCRIPT_PATH")

    case "$LINK_TARGET" in
        /*)
            SCRIPT_PATH=$LINK_TARGET
            ;;
        *)
            SCRIPT_PATH=$(dirname -- "$SCRIPT_PATH")/$LINK_TARGET
            ;;
    esac
done

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$SCRIPT_PATH")" && pwd)

case "${QUEUE:-0}" in
    1|2|true|TRUE|yes|YES|on|ON)
        exec "$SCRIPT_DIR/start-queue-daemon.sh"
        ;;
    *)
        exit 0
        ;;
esac

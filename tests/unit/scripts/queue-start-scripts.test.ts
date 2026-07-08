import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "../../..");

describe("queue startup scripts", () => {
    it("keeps queue daemon startup non-blocking for single container web mode", () => {
        const source = readFileSync(
            path.join(projectRoot, "scripts/runtime/start-queue-daemon.sh"),
            "utf8"
        );

        expect(source).toContain("pm2 startOrReload");
        expect(source).not.toContain("pm2 delete");
        expect(source).not.toContain("pm2 kill");
        expect(source).not.toContain("exec pm2 start");
    });

    it("starts the queue daemon in the background before web startup", () => {
        const source = readFileSync(path.join(projectRoot, "scripts/runtime/start-web.sh"), "utf8");

        expect(source).toContain('QUEUE_PM2_HOME="${QUEUE_PM2_HOME:-/app/.pm2-queue}"');
        expect(source).toContain(
            'QUEUE_DAEMON_LOG="${QUEUE_DAEMON_LOG:-$QUEUE_PM2_HOME/start-queue-daemon.log}"'
        );
        expect(source).toContain(
            '"$SCRIPT_DIR/start-queue-daemon.sh" >>"$QUEUE_DAEMON_LOG" 2>&1 &'
        );
        expect(source).toContain('exec "$@" "$SERVER_ENTRY"');
    });
});

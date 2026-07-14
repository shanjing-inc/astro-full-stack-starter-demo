import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const demoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const pm2ConfigPath = path.join(demoRoot, "src/queues/queue.pm2.config.cjs");

describe("demo processGroups pm2 config", () => {
    it("generates queue-workers for all queues plus scheduler", () => {
        const config = require(pm2ConfigPath) as {
            apps: Array<{ args?: string; name: string }>;
        };

        expect(config.apps.map((app) => app.name)).toEqual(["queue-workers", "queue-scheduler"]);
        expect(config.apps[0]?.args).toBe("--queues=critical,default,low");
    });
});

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const workspaceRoot = path.resolve(rootDir, "../..");

function readProjectFile(relativePath: string) {
    return readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readWorkspaceFile(relativePath: string) {
    return readFileSync(path.join(workspaceRoot, relativePath), "utf8");
}

function expectProjectFile(relativePath: string) {
    expect(existsSync(path.join(rootDir, relativePath)), `${relativePath} should exist`).toBe(true);
}

describe("Cloudflare demo parity with Deno demo", () => {
    it("keeps the Sentry runtime and sourcemap release chain", () => {
        const projectPackageJson = JSON.parse(readProjectFile("package.json")) as {
            scripts: Record<string, string>;
        };
        const workspacePackageJson = JSON.parse(readWorkspaceFile("package.json")) as {
            scripts: Record<string, string>;
        };
        const astroConfig = readProjectFile("astro.config.mjs");

        expectProjectFile("scripts/upload-sentry-sourcemaps.mjs");
        expectProjectFile("src/middleware.ts");
        expectProjectFile("src/observability/sentry-middleware.ts");
        expect(projectPackageJson.scripts["sentry:sourcemaps"]).toBe(
            "node ./scripts/upload-sentry-sourcemaps.mjs"
        );
        expect(workspacePackageJson.scripts["cloudflare-d1-demo:sentry:sourcemaps"]).toBe(
            "pnpm --filter cloudflare-d1-demo sentry:sourcemaps"
        );
        expect(astroConfig).toContain('import sentry from "@sentry/astro";');
        expect(astroConfig).toContain("sentry({");
        expect(astroConfig).toContain('sourcemap: "hidden"');
    });

    it("keeps the public React island and persistent theme smoke", () => {
        const indexPage = readProjectFile("src/pages/index.astro");
        const layout = readProjectFile("src/layouts/base-layout.astro");

        expectProjectFile("src/components/public/counter-island.tsx");
        expectProjectFile("src/components/public/site-theme-toggle.tsx");
        expectProjectFile("src/stores/counter.ts");
        expectProjectFile("src/stores/site-theme.ts");
        expect(indexPage).toContain(
            'import CounterIsland from "@/components/public/counter-island";'
        );
        expect(indexPage).toContain("<CounterIsland client:load />");
        expect(layout).toContain(
            'import { SiteThemeToggle } from "@/components/public/site-theme-toggle";'
        );
        expect(layout).toContain('<SiteThemeToggle client:only="react" />');
        expect(readProjectFile("src/stores/counter.ts")).toContain("persistentAtom<number>");
        expect(readProjectFile("src/stores/site-theme.ts")).toContain("persistentAtom<SiteTheme>");
    });

    it("injects GraphQL loaders into the request context", () => {
        const contextFile = readProjectFile("src/graphql/context.ts");

        expectProjectFile("src/graphql/loaders/index.ts");
        expectProjectFile("src/graphql/loaders/shop.ts");
        expectProjectFile("src/graphql/loaders/product.ts");
        expectProjectFile("src/graphql/loaders/order.ts");
        expect(contextFile).toContain('import { createGraphQLLoaders } from "@/graphql/loaders";');
        expect(contextFile).toContain("loaders: createGraphQLLoaders");
    });

    it("keeps WebSocket endpoint parity with the Deno demo", () => {
        const astroConfig = readProjectFile("astro.config.mjs");
        const wranglerConfig = readProjectFile("wrangler.jsonc");

        expectProjectFile("src/worker.ts");
        expectProjectFile("src/websocket/adapters/public.ts");
        expectProjectFile("src/websocket/adapters/member.ts");
        expectProjectFile("src/websocket/adapters/super-admin.ts");
        expectProjectFile("src/websocket/features/server-push-demo.ts");
        expectProjectFile("src/websocket/reporter.ts");
        expectProjectFile("src/middleware/member.ts");
        expect(astroConfig).toContain("websocket: {");
        expect(astroConfig).toContain('path: "/api/websocket/public"');
        expect(astroConfig).toContain('path: "/api/websocket/member"');
        expect(astroConfig).toContain('path: "/api/websocket/super-admin"');
        expect(astroConfig).toContain('websocketEndpoint: "superAdmin"');
        expect(wranglerConfig).toContain('"main": "./src/worker.ts"');
        expect(wranglerConfig).toContain('"name": "WEBSOCKET_ROOM"');
        expect(wranglerConfig).toContain('"class_name": "PublicWebSocketRoom"');
        expect(wranglerConfig).toContain('"new_sqlite_classes": ["PublicWebSocketRoom"]');
    });

    it("configures Cloudflare Queues runtime wiring", () => {
        const wranglerConfig = readProjectFile("wrangler.jsonc");
        const worker = readProjectFile("src/worker.ts");
        const runtime = readProjectFile("src/queues/runtime.ts");
        const queueConfig = readProjectFile("src/queues/config.ts");
        const queueDemoJob = readProjectFile("src/queues/jobs/queue-demo.job.ts");
        const testQueuePage = readProjectFile("src/pages/test/queue.astro");

        expectProjectFile("src/queues/runtime.ts");
        expectProjectFile("src/queues/registry.ts");
        expectProjectFile("src/queues/config.ts");
        expectProjectFile("src/queues/jobs/queue-demo.job.ts");
        expect(wranglerConfig).toContain('"binding": "QUEUE_CRITICAL"');
        expect(wranglerConfig).toContain('"binding": "QUEUE_DEFAULT"');
        expect(wranglerConfig).toContain('"binding": "QUEUE_LOW"');
        expect(wranglerConfig).not.toContain("dead_letter_queue");
        expect(wranglerConfig).not.toContain("QUEUE_DLQ_NAME");
        expect(wranglerConfig).toContain('"queue": "astro-full-stack-cloudflare-d1-demo-critical"');
        expect(wranglerConfig).toContain('"queue": "astro-full-stack-cloudflare-d1-demo-default"');
        expect(wranglerConfig).toContain('"queue": "astro-full-stack-cloudflare-d1-demo-low"');
        expect(wranglerConfig).toContain('"max_concurrency": 1');
        expect(wranglerConfig).toContain('"crons": ["30 4 * * *"]');
        expect(runtime).toContain("cleanupQueueExecutionRecords");
        expect(runtime).toContain("QUEUE_CRITICAL");
        expect(runtime).toContain("QUEUE_DEFAULT");
        expect(runtime).toContain("QUEUE_LOW");
        expect(runtime).toContain("bindings:");
        expect(worker).toContain("async queue(batch, env, _context)");
        expect(worker).toContain("await createQueueRuntime(env).consumeBatch(batch)");
        expect(worker).not.toContain("waitUntil(createQueueRuntime(env).consumeBatch(batch))");
        expect(worker).toContain("async scheduled(_controller, env, context)");
        expect(worker).toContain("cleanupQueueExecutionRecords(env)");
        expect(queueConfig).toContain('name: "critical"');
        expect(queueConfig).toContain('name: "default"');
        expect(queueConfig).toContain('name: "low"');
        expect(queueConfig).toContain('binding: "QUEUE_LOW"');
        expect(queueConfig).not.toContain("bindingName");
        expect(queueConfig).not.toContain("dlqQueueName");
        expect(queueConfig).not.toContain("astro-full-stack-cloudflare-d1-demo-low");
        expect(queueDemoJob).toContain('from "@/queues/config"');
        expect(testQueuePage).toContain("critical、default、low");
        expect(testQueuePage).toContain(
            "const defaultSuccessButtonClass = queueTones.default?.button ?? queueTones.fallback.button;"
        );
        expect(testQueuePage).toContain('data-preserve-scroll="queue-status-refresh"');
        expect(testQueuePage).toContain('const scrollStorageKey = "queue-test:scroll-y";');
        expect(testQueuePage).toContain(
            'window.scrollTo({ top: savedScrollY, behavior: "instant" });'
        );
        expect(testQueuePage).not.toContain("${tone.button}");
        expect(testQueuePage).not.toContain('value="all"');
        expect(testQueuePage).not.toContain("同时触发所有");
        expect(testQueuePage).not.toContain("全部失败一次");
        expect(testQueuePage).not.toContain("派发所有队列任务");
    });
});

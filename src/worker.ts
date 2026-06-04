import astroWorker from "@astrojs/cloudflare/entrypoints/server";
import {
    createCloudflareWebSocketDurableObject,
    createCloudflareWebSocketDurableObjectFetch,
} from "@shanjing/astro-full-stack-starter/websocket/platforms/cloudflare";
import { type CloudflareQueueBatch } from "@shanjing/astro-full-stack-starter/queue/adapters/cloudflare-queues";
import { type QueueMessageEnvelope } from "@shanjing/astro-full-stack-starter/queue/core";
import { CacheDurableObject } from "@shanjing/astro-full-stack-starter/cache/adapters/cloudflare";
import { adapter as publicWebSocketAdapter } from "./websocket/adapters/public";
import { cleanupQueueExecutionRecords, createQueueRuntime } from "./queues/runtime";

interface WorkerExecutionContext {
    passThroughOnException: () => void;
    waitUntil: (promise: Promise<unknown>) => void;
}

interface WorkerHandler {
    fetch: (
        request: Request,
        env: CloudflareRuntime["env"],
        context: WorkerExecutionContext
    ) => Promise<Response>;
    queue: (
        batch: CloudflareQueueBatch<QueueMessageEnvelope>,
        env: CloudflareRuntime["env"],
        context: WorkerExecutionContext
    ) => Promise<void>;
    scheduled: (
        controller: { cron: string; scheduledTime: number },
        env: CloudflareRuntime["env"],
        context: WorkerExecutionContext
    ) => Promise<void>;
}

const handlePublicWebSocketDurableObjectFetch = createCloudflareWebSocketDurableObjectFetch({
    adapter: publicWebSocketAdapter,
    name: "public",
    path: "/api/websocket/public",
});

export const PublicWebSocketRoom = createCloudflareWebSocketDurableObject({
    adapter: publicWebSocketAdapter,
    name: "public",
});

export class CacheObject extends CacheDurableObject {}

export default {
    async fetch(request, env, context) {
        const webSocketResponse = await handlePublicWebSocketDurableObjectFetch(request, env);

        if (webSocketResponse) {
            return webSocketResponse;
        }

        return astroWorker.fetch(request, env as never, context as never);
    },
    async queue(batch, env, _context) {
        await createQueueRuntime(env).consumeBatch(batch);
    },
    async scheduled(_controller, env, context) {
        context.waitUntil(cleanupQueueExecutionRecords(env));
    },
} satisfies WorkerHandler;

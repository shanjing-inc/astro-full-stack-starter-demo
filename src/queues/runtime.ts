import "./config.ts";

import { createBullMqQueueAdapter } from "@shanjing/astro-full-stack-starter/queue/adapters/bullmq";
import { createJobRegistry } from "@shanjing/astro-full-stack-starter/queue/core";
import { registerBuiltinQueueJobs } from "@shanjing/astro-full-stack-starter/queue/jobs";
import { createRedisQueueExecutionStore } from "@shanjing/astro-full-stack-starter/queue/stores/redis";

import { createQueueRedisConnection } from "./config.ts";
import { registerAllJobs } from "./jobs/manifest.generated.ts";

export const queueRuntime = createBullMqQueueAdapter();

export function createQueueExecutionStore() {
    const redis = createQueueRedisConnection("producer");
    const store = createRedisQueueExecutionStore(redis);

    return {
        ...store,
        close() {
            redis.disconnect(false);
        },
    };
}

export function createQueueJobRegistry() {
    const registry = createJobRegistry();

    registerBuiltinQueueJobs(registry);
    registerAllJobs(registry);

    return registry;
}

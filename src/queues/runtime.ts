import {
    createCloudflareQueuesAdapter,
    type CloudflareQueueBinding,
} from "@shanjing/astro-full-stack-starter/queue/adapters/cloudflare-queues";
import {
    createD1QueueExecutionStore,
    type QueueD1Database,
} from "@shanjing/astro-full-stack-starter/queue/stores/d1";
import { type QueueMessageEnvelope } from "@shanjing/astro-full-stack-starter/queue/core";
import { getQueueExecutionRecordTtlSeconds } from "@shanjing/astro-full-stack-starter/queue/config";
import { RuntimeConfigurationError } from "@shanjing/astro-full-stack-starter/runtime/env";

import { type CloudflareD1RuntimeEnv } from "@/db/client";
import { cloudflareQueueConfigs } from "@/queues/config";
import { createCloudflareQueueRegistry } from "@/queues/registry";

const defaultCleanupLimit = 500;

export interface CloudflareQueueRuntimeEnv extends CloudflareD1RuntimeEnv {
    QUEUE_CRITICAL?: CloudflareQueueBinding<QueueMessageEnvelope>;
    QUEUE_DEFAULT?: CloudflareQueueBinding<QueueMessageEnvelope>;
    QUEUE_LOW?: CloudflareQueueBinding<QueueMessageEnvelope>;
}

function getQueueBinding(
    env: CloudflareQueueRuntimeEnv,
    binding: (typeof cloudflareQueueConfigs)[number]["binding"]
) {
    return env[binding];
}

function createQueueBindings(env: CloudflareQueueRuntimeEnv) {
    const bindings: Record<string, CloudflareQueueBinding<QueueMessageEnvelope>> = {};

    for (const config of cloudflareQueueConfigs) {
        const binding = getQueueBinding(env, config.binding);

        if (binding) {
            bindings[config.name] = binding;
        }
    }

    return bindings;
}

function resolveCloudflareQueueExecutionRecordTtlSeconds(env: CloudflareQueueRuntimeEnv) {
    const envValue = env.QUEUE_EXECUTION_RECORD_TTL_SECONDS?.trim();

    if (!envValue) {
        return getQueueExecutionRecordTtlSeconds();
    }

    const parsed = Number(envValue);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new RuntimeConfigurationError("QUEUE_EXECUTION_RECORD_TTL_SECONDS 必须是正整数。");
    }

    return parsed;
}

export function createQueueRuntime(env: CloudflareQueueRuntimeEnv) {
    if (!env.DB) {
        throw new Error("Cloudflare D1 binding DB is required for queue execution store.");
    }

    const executionStore = createD1QueueExecutionStore(env.DB as QueueD1Database);

    return createCloudflareQueuesAdapter({
        bindings: createQueueBindings(env),
        executionStore,
        registry: createCloudflareQueueRegistry(),
    });
}

export function createQueueExecutionStore(env: CloudflareQueueRuntimeEnv) {
    if (!env.DB) {
        throw new Error("Cloudflare D1 binding DB is required for queue execution store.");
    }

    return createD1QueueExecutionStore(env.DB as QueueD1Database);
}

export async function cleanupQueueExecutionRecords(env: CloudflareQueueRuntimeEnv) {
    const executionStore = createQueueExecutionStore(env);
    const ttlSeconds = resolveCloudflareQueueExecutionRecordTtlSeconds(env);
    const updatedBefore = new Date(Date.now() - ttlSeconds * 1000).toISOString();
    const summary = await executionStore.pruneExpired?.({
        limit: defaultCleanupLimit,
        statuses: ["completed", "failed"],
        updatedBefore,
    });

    return (
        summary ?? {
            deleted: 0,
            updatedBefore,
        }
    );
}

import { AstroError } from "astro/errors";
import { env } from "cloudflare:workers";

import { createD1DatabaseProvider } from "@shanjing/astro-full-stack-starter/db/d1/provider";

import { dbRelations } from "@/db/relations";
import { dbSchema } from "@/db/schemas";

import type { AnyD1Database } from "drizzle-orm/d1";
import type { CloudflareQueueBinding } from "@shanjing/astro-full-stack-starter/queue/adapters/cloudflare-queues";
import type { QueueMessageEnvelope } from "@shanjing/astro-full-stack-starter/queue/core";
import type {
    CloudflareCacheNamespace,
    CloudflareKvNamespaceLike,
} from "@shanjing/astro-full-stack-starter/cache/adapters/cloudflare";

export interface CloudflareD1RuntimeEnv {
    BETTER_AUTH_ALLOWED_HOSTS?: string;
    BETTER_AUTH_SECRET?: string;
    CACHE_KV?: CloudflareKvNamespaceLike;
    CACHE_OBJECT?: CloudflareCacheNamespace;
    DB?: AnyD1Database;
    LOG_SQL?: string;
    QUEUE?: CloudflareQueueBinding<QueueMessageEnvelope>;
    QUEUE_EXECUTION_RECORD_TTL_SECONDS?: string;
    SENTRY_DSN?: string;
    SENTRY_RELEASE?: string;
}

export function createCloudflareD1DatabaseProvider(env: CloudflareD1RuntimeEnv) {
    return createD1DatabaseProvider({
        getBinding: (name) => {
            if (name === "DB") {
                return env.DB;
            }

            return undefined;
        },
        relations: dbRelations,
        schema: dbSchema,
    });
}

export function getCloudflareD1Env(): CloudflareD1RuntimeEnv & CloudflareRuntime["env"] {
    if (!env) {
        throw new AstroError("Missing Cloudflare runtime env.");
    }

    return env as unknown as CloudflareD1RuntimeEnv & CloudflareRuntime["env"];
}

export function getCloudflareEnvVar(name: keyof Omit<CloudflareD1RuntimeEnv, "DB" | "QUEUE">) {
    return (getCloudflareD1Env() as CloudflareD1RuntimeEnv)[name];
}

export type CloudflareD1DatabaseProvider = ReturnType<typeof createCloudflareD1DatabaseProvider>;
export type Database = ReturnType<CloudflareD1DatabaseProvider["getDb"]>;

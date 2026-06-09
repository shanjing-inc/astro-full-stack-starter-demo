/// <reference types="astro/client" />

import type { auth } from "@/lib/auth";

type AuthSession = typeof auth.$Infer.Session;

declare global {
    namespace App {
        interface Locals {
            session: AuthSession["session"] | null;
            user: AuthSession["user"] | null;
            isUpgradeRequest: boolean;
            upgradeWebSocket(): { response: Response; socket: WebSocket };
        }
    }

    interface CloudflareRuntime {
        env: {
            BETTER_AUTH_ALLOWED_HOSTS?: string;
            BETTER_AUTH_SECRET?: string;
            DB?: import("drizzle-orm/d1").AnyD1Database;
            CACHE_KV?: import("@shanjing/astro-full-stack-starter/cache/adapters/cloudflare").CloudflareKvNamespaceLike;
            CACHE_OBJECT?: import("@shanjing/astro-full-stack-starter/cache/adapters/cloudflare").CloudflareCacheNamespace;
            LOG_SQL?: string;
            QUEUE?: import("@shanjing/astro-full-stack-starter/queue/adapters/cloudflare-queues").CloudflareQueueBinding<
                import("@shanjing/astro-full-stack-starter/queue/core").QueueMessageEnvelope
            >;
            QUEUE_EXECUTION_RECORD_TTL_SECONDS?: string;
            SENTRY_DSN?: string;
            SENTRY_RELEASE?: string;
            WEBSOCKET_ROOM?: import("@shanjing/astro-full-stack-starter/websocket/platforms/cloudflare").CloudflareDurableObjectNamespace;
            WEBSOCKET_ALLOWED_ORIGINS?: string;
            WEBSOCKET_IDLE_TIMEOUT_SECONDS?: string;
            WEBSOCKET_MAX_CONNECTIONS?: string;
        };
    }

    interface ImportMetaEnv {
        readonly BETTER_AUTH_ALLOWED_HOSTS?: string;
        readonly BETTER_AUTH_SECRET?: string;
        readonly LOG_SQL?: string;
        readonly QUEUE_EXECUTION_RECORD_TTL_SECONDS?: string;
        readonly SENTRY_DSN?: string;
        readonly SENTRY_RELEASE?: string;
        readonly TZ?: string;
        readonly WEBSOCKET_ALLOWED_ORIGINS?: string;
        readonly WEBSOCKET_IDLE_TIMEOUT_SECONDS?: string;
        readonly WEBSOCKET_MAX_CONNECTIONS?: string;
    }

    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }
}

declare module "cloudflare:workers" {
    export const env: CloudflareRuntime["env"];
}

export {};

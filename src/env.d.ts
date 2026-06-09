/// <reference types="astro/client" />

import type { auth } from "@/lib/auth";

type AuthSession = typeof auth.$Infer.Session;

declare global {
    namespace App {
        interface Locals {
            user: AuthSession["user"] | null;
            session: AuthSession["session"] | null;
            isUpgradeRequest: boolean;
            upgradeWebSocket(): { response: Response; socket: WebSocket };
        }
    }

    interface ImportMetaEnv {
        readonly APP_ORIGIN?: string;
        readonly BETTER_AUTH_ALLOWED_HOSTS?: string;
        readonly BETTER_AUTH_SECRET?: string;
        readonly DATABASE_URL?: string;
        readonly LOG_SQL?: string;
        readonly QUEUE_EXECUTION_RECORD_TTL_SECONDS?: string;
        readonly QUEUE_JOB_RETENTION_COUNT?: string;
        readonly QUEUE_JOB_RETENTION_SECONDS?: string;
        readonly REDIS_KEY_PREFIX?: string;
        readonly REDIS_URL?: string;
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

export {};

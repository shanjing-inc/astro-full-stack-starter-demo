import { sequence } from "astro:middleware";

import { getIdleMemoryReclaimController } from "@shanjing/astro-full-stack-starter/runtime/idle-memory-reclaim";
import { onRequest as memberAccessMiddleware } from "@/middleware/member";
import { sentryMiddleware } from "@/observability/sentry-middleware";

import type { MiddlewareHandler } from "astro";

const idleMemoryReclaimMiddleware: MiddlewareHandler = async (context, next) => {
    const finishRequest = getIdleMemoryReclaimController().beginHttpRequest(context.url.pathname);

    try {
        const response = await next();
        finishRequest(response.status);
        return response;
    } catch (error) {
        finishRequest();
        throw error;
    }
};

export const onRequest = sequence(
    idleMemoryReclaimMiddleware,
    sentryMiddleware,
    memberAccessMiddleware
);

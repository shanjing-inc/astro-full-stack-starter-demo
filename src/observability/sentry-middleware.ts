import { reportException } from "@/observability/sentry";
import { createSentryMiddleware } from "@shanjing/astro-full-stack-starter/observability/sentry/middleware";

import type { MiddlewareHandler } from "astro";

export const sentryMiddleware: MiddlewareHandler = createSentryMiddleware({
    reporter: {
        initSentry() {},
        reportException,
    },
    tagRuntime: "cloudflare-worker",
});

import { sequence } from "astro:middleware";

import { onRequest as memberAccessMiddleware } from "@/middleware/member";
import { sentryMiddleware } from "@/observability/sentry-middleware";
import { onRequest as cloudflareWebSocketMiddleware } from "@shanjing/astro-full-stack-starter/websocket/platforms/cloudflare";

export const onRequest = sequence(
    cloudflareWebSocketMiddleware,
    sentryMiddleware,
    memberAccessMiddleware
);

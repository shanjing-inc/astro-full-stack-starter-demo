import { sequence } from "astro:middleware";

import { onRequest as memberAccessMiddleware } from "@/middleware/member";
import { sentryMiddleware } from "@/observability/sentry-middleware";

export const onRequest = sequence(sentryMiddleware, memberAccessMiddleware);

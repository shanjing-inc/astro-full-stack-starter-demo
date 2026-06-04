import { reportException, reportMessage } from "@/observability/sentry";

import type { WebSocketReporter } from "@shanjing/astro-full-stack-starter/websocket/types";

export const websocketReporter = {
    reportException,
    reportMessage,
} satisfies WebSocketReporter;

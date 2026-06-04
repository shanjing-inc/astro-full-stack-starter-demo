import { createWebSocketEndpointAdapter } from "@shanjing/astro-full-stack-starter/websocket/adapter";
import { createWebSocketClientMessageSchema } from "@shanjing/astro-full-stack-starter/websocket/protocol/messages";
import { websocketReporter } from "@/websocket/reporter";

import type { WebSocketEndpointAdapterDefinition } from "@shanjing/astro-full-stack-starter/websocket/adapter";
import type { WebSocketEndpointHandlers } from "@shanjing/astro-full-stack-starter/websocket/types";

const superAdminWebSocketClientMessageSchema = createWebSocketClientMessageSchema([]);

function createSuperAdminWebSocketHandlers(): WebSocketEndpointHandlers {
    return {
        dispose() {},
        handleMessage() {
            return false;
        },
    };
}

export const superAdminWebSocketEndpoint = {
    clientMessageSchema: superAdminWebSocketClientMessageSchema,
    createHandlers: createSuperAdminWebSocketHandlers,
} as const satisfies WebSocketEndpointAdapterDefinition;

export const adapter = createWebSocketEndpointAdapter(superAdminWebSocketEndpoint, {
    cloudflare: {
        driver: "webSocketPair",
    },
    reporter: websocketReporter,
});

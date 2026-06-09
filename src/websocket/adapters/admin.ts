import { createWebSocketEndpointAdapter } from "@shanjing/astro-full-stack-starter/websocket/adapter";
import { createWebSocketClientMessageSchema } from "@shanjing/astro-full-stack-starter/websocket/protocol/messages";
import { websocketReporter } from "@/websocket/reporter";

import type { WebSocketEndpointAdapterDefinition } from "@shanjing/astro-full-stack-starter/websocket/adapter";
import type { WebSocketEndpointHandlers } from "@shanjing/astro-full-stack-starter/websocket/types";

const adminWebSocketClientMessageSchema = createWebSocketClientMessageSchema([]);

function createAdminWebSocketHandlers(): WebSocketEndpointHandlers {
    return {
        dispose() {},
        handleMessage() {
            return false;
        },
    };
}

export const adminWebSocketEndpoint = {
    clientMessageSchema: adminWebSocketClientMessageSchema,
    createHandlers: createAdminWebSocketHandlers,
} as const satisfies WebSocketEndpointAdapterDefinition;

export const adapter = createWebSocketEndpointAdapter(adminWebSocketEndpoint, {
    cloudflare: {
        driver: "webSocketPair",
    },
    reporter: websocketReporter,
});

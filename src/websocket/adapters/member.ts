import { createWebSocketEndpointAdapter } from "@shanjing/astro-full-stack-starter/websocket/adapter";
import { createWebSocketClientMessageSchema } from "@shanjing/astro-full-stack-starter/websocket/protocol/messages";
import { websocketReporter } from "@/websocket/reporter";

import type { WebSocketEndpointAdapterDefinition } from "@shanjing/astro-full-stack-starter/websocket/adapter";
import type { WebSocketEndpointHandlers } from "@shanjing/astro-full-stack-starter/websocket/types";

const memberWebSocketClientMessageSchema = createWebSocketClientMessageSchema([]);

function createMemberWebSocketHandlers(): WebSocketEndpointHandlers {
    return {
        dispose() {},
        handleMessage() {
            return false;
        },
    };
}

export const memberWebSocketEndpoint = {
    clientMessageSchema: memberWebSocketClientMessageSchema,
    createHandlers: createMemberWebSocketHandlers,
} as const satisfies WebSocketEndpointAdapterDefinition;

export const adapter = createWebSocketEndpointAdapter(memberWebSocketEndpoint, {
    cloudflare: {
        driver: "webSocketPair",
    },
    reporter: websocketReporter,
});

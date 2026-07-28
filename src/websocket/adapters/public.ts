import { recordIdleMemoryBusinessActivity } from "@shanjing/astro-full-stack-starter/runtime/idle-memory-reclaim";
import { createWebSocketEndpointAdapter } from "@shanjing/astro-full-stack-starter/websocket/adapter";
import { createWebSocketClientMessageSchema } from "@shanjing/astro-full-stack-starter/websocket/protocol/messages";
import { serverPushDemoClientMessageSchema } from "@/websocket/features/server-push-demo";
import { createServerPushDemoHandler } from "@/websocket/features/server-push-demo";
import { websocketReporter } from "@/websocket/reporter";

import type { ServerPushDemoServerMessageInput } from "@/websocket/features/server-push-demo";
import type { WebSocketEndpointAdapterDefinition } from "@shanjing/astro-full-stack-starter/websocket/adapter";
import type {
    WebSocketConnectionContext,
    WebSocketEndpointModule,
    WebSocketEndpointHandlerOptions,
    WebSocketEndpointHandlers,
} from "@shanjing/astro-full-stack-starter/websocket/types";

const publicWebSocketClientMessageSchema = createWebSocketClientMessageSchema([
    serverPushDemoClientMessageSchema,
]);

type PublicWebSocketConnectionContext = WebSocketConnectionContext<
    WebSocketEndpointModule<string, ServerPushDemoServerMessageInput>
>;

function createPublicWebSocketHandlers(
    _context: PublicWebSocketConnectionContext,
    options: WebSocketEndpointHandlerOptions<ServerPushDemoServerMessageInput>
): WebSocketEndpointHandlers {
    recordIdleMemoryBusinessActivity("websocket-connect");
    const serverPushDemoHandler = createServerPushDemoHandler(options);

    return {
        dispose() {
            serverPushDemoHandler.dispose();
        },
        handleMessage(message) {
            if (message.type !== "ping") {
                recordIdleMemoryBusinessActivity("websocket-message");
            }

            if (message.type === "serverPushDemo") {
                serverPushDemoHandler.handle(serverPushDemoClientMessageSchema.parse(message));
                return true;
            }

            return false;
        },
    };
}

export const publicWebSocketEndpoint = {
    clientMessageSchema: publicWebSocketClientMessageSchema,
    createHandlers: createPublicWebSocketHandlers,
} as const satisfies WebSocketEndpointAdapterDefinition<ServerPushDemoServerMessageInput>;

export const adapter = createWebSocketEndpointAdapter(publicWebSocketEndpoint, {
    reporter: websocketReporter,
});

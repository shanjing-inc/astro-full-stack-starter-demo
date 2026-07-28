import { recordIdleMemoryBusinessActivity } from "@shanjing/astro-full-stack-starter/runtime/idle-memory-reclaim";
import { createSseEndpointAdapter } from "@shanjing/astro-full-stack-starter/sse/adapter";

import type { SseEndpointAdapterDefinition } from "@shanjing/astro-full-stack-starter/sse/adapter";
import type {
    SseConnection,
    SseConnectionContext,
} from "@shanjing/astro-full-stack-starter/sse/types";

const SSE_SERVER_PUSH_DEMO_INTERVAL_MS = 2000;
const SSE_SERVER_PUSH_DEMO_TOTAL = 5;

type SseDemoTimer = ReturnType<typeof setTimeout>;

function createServerPushMessage(index: number) {
    const message =
        index === 1
            ? "推送开始"
            : index === SSE_SERVER_PUSH_DEMO_TOTAL
              ? "推送结束"
              : `服务端主动推送 ${index}/${SSE_SERVER_PUSH_DEMO_TOTAL}`;

    return {
        index,
        message,
        total: SSE_SERVER_PUSH_DEMO_TOTAL,
    };
}

function createPublicSseConnection(context: SseConnectionContext, connection: SseConnection) {
    recordIdleMemoryBusinessActivity("sse-connect");
    const timers = new Set<SseDemoTimer>();

    function registerTimer(timer: SseDemoTimer) {
        timers.add(timer);

        return timer;
    }

    connection.sendEvent({
        data: {
            endpoint: context.endpoint.name,
        },
        event: "ready",
    });

    for (let index = 1; index <= SSE_SERVER_PUSH_DEMO_TOTAL; index += 1) {
        const timer = registerTimer(
            setTimeout(() => {
                timers.delete(timer);

                if (!connection.isOpen()) {
                    return;
                }

                connection.sendEvent({
                    data: createServerPushMessage(index),
                    event: "serverPush",
                });

                if (index === SSE_SERVER_PUSH_DEMO_TOTAL) {
                    connection.sendEvent({
                        data: {
                            message: "推送结束，连接已关闭。",
                        },
                        event: "done",
                    });
                    connection.close();
                }
            }, index * SSE_SERVER_PUSH_DEMO_INTERVAL_MS)
        );
    }

    return {
        dispose() {
            for (const timer of timers) {
                clearTimeout(timer);
            }

            timers.clear();
        },
    };
}

export const publicSseEndpoint = {
    createConnection: createPublicSseConnection,
} satisfies SseEndpointAdapterDefinition;

export const adapter = createSseEndpointAdapter(publicSseEndpoint, {
    heartbeatComment: "heartbeat",
    heartbeatIntervalMs: 15000,
});

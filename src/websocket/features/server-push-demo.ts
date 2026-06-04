import { z } from "zod";

const SERVER_PUSH_DEMO_INTERVAL_MS = 2000;
const SERVER_PUSH_DEMO_TOTAL = 5;

type ServerPushDemoTimer = ReturnType<typeof setTimeout>;

export const serverPushDemoClientMessageSchema = z.object({
    payload: z
        .object({
            message: z.string().min(1).max(2000).optional(),
        })
        .optional(),
    type: z.literal("serverPushDemo"),
});

export type ServerPushDemoClientMessage = z.infer<typeof serverPushDemoClientMessageSchema>;

export interface ServerPushDemoServerMessageInput {
    payload: {
        index: number;
        message: string;
        total: number;
    };
    type: "serverPush";
}

interface ServerPushDemoHandlerOptions {
    isSocketOpen: () => boolean;
    sendError: (message: string) => void;
    sendMessage: (message: ServerPushDemoServerMessageInput) => void;
}

export interface ServerPushDemoHandler {
    dispose: () => void;
    handle: (message: ServerPushDemoClientMessage) => void;
}

function createServerPushMessage(index: number): ServerPushDemoServerMessageInput {
    const message =
        index === 1
            ? "推送开始"
            : index === SERVER_PUSH_DEMO_TOTAL
              ? "推送结束"
              : `服务端主动推送 ${index}/${SERVER_PUSH_DEMO_TOTAL}`;

    return {
        payload: {
            index,
            message,
            total: SERVER_PUSH_DEMO_TOTAL,
        },
        type: "serverPush",
    };
}

/**
 * Creates the stateful demo task that pushes five messages to one active socket.
 */
export function createServerPushDemoHandler(
    options: ServerPushDemoHandlerOptions
): ServerPushDemoHandler {
    let active = false;
    const timers = new Set<ServerPushDemoTimer>();

    function dispose() {
        for (const timer of timers) {
            clearTimeout(timer);
        }

        timers.clear();
        active = false;
    }

    function handle() {
        if (active) {
            options.sendError("已有推送任务正在运行。");
            return;
        }

        active = true;

        for (let index = 1; index <= SERVER_PUSH_DEMO_TOTAL; index += 1) {
            const timer = setTimeout(() => {
                timers.delete(timer);

                if (!options.isSocketOpen()) {
                    dispose();
                    return;
                }

                options.sendMessage(createServerPushMessage(index));

                if (index === SERVER_PUSH_DEMO_TOTAL) {
                    active = false;
                }
            }, index * SERVER_PUSH_DEMO_INTERVAL_MS);

            timers.add(timer);
        }
    }

    return {
        dispose,
        handle,
    };
}

import { afterEach, describe, expect, it, vi } from "vitest";

import {
    canAcceptWebSocketConnection,
    getActiveWebSocketCount,
    handleWebSocket,
} from "@shanjing/astro-full-stack-starter/websocket/server";
import { createNamedWebSocketEndpoint } from "@shanjing/astro-full-stack-starter/websocket/adapter";
import { createServerPushDemoHandler } from "@/websocket/features/server-push-demo";
import { adapter as memberWebSocketAdapter } from "@/websocket/adapters/member";
import { adapter as publicWebSocketAdapter } from "@/websocket/adapters/public";

import type { WebSocketConnectionContext } from "@shanjing/astro-full-stack-starter/websocket/server";

class MockWebSocket extends EventTarget {
    readonly sentMessages: string[] = [];
    private readonly listenerCounts = new Map<string, number>();

    readyState: number = WebSocket.OPEN;
    closeCode?: number;
    closeReason?: string;

    override addEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: AddEventListenerOptions | boolean
    ) {
        super.addEventListener(type, callback, options);

        if (callback === null) {
            return;
        }

        this.listenerCounts.set(type, this.getListenerCount(type) + 1);
    }

    close(code?: number, reason?: string) {
        this.closeCode = code;
        this.closeReason = reason;
        this.readyState = WebSocket.CLOSED;
        this.dispatchEvent(new Event("close"));
    }

    getListenerCount(type: string) {
        return this.listenerCounts.get(type) ?? 0;
    }

    override removeEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean
    ) {
        super.removeEventListener(type, callback, options);

        if (callback === null) {
            return;
        }

        this.listenerCounts.set(type, Math.max(this.getListenerCount(type) - 1, 0));
    }

    send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
        this.sentMessages.push(String(data));
    }
}

function createMockWebSocket() {
    return new MockWebSocket() as unknown as WebSocket & MockWebSocket;
}

function parseSentMessage(socket: MockWebSocket, index: number) {
    return JSON.parse(socket.sentMessages[index] ?? "");
}

const memberWebSocketEndpoint = createNamedWebSocketEndpoint("member", memberWebSocketAdapter);
const publicWebSocketEndpoint = createNamedWebSocketEndpoint("public", publicWebSocketAdapter);

const publicWebSocketContext: WebSocketConnectionContext<typeof publicWebSocketEndpoint> = {
    endpoint: publicWebSocketEndpoint,
    session: null,
    user: null,
};

const memberWebSocketContext: WebSocketConnectionContext<typeof memberWebSocketEndpoint> = {
    endpoint: memberWebSocketEndpoint,
    session: null,
    user: null,
};

describe("websocket server", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.useRealTimers();
    });

    it("sends a ready message and releases closed sockets", () => {
        const socket = createMockWebSocket();

        handleWebSocket(socket, publicWebSocketContext);

        expect(getActiveWebSocketCount()).toBe(1);
        expect(socket.getListenerCount("message")).toBe(1);
        expect(socket.getListenerCount("close")).toBe(1);
        expect(socket.getListenerCount("error")).toBe(1);
        expect(parseSentMessage(socket, 0)).toEqual({
            payload: {
                connectionId: expect.any(String),
                endpoint: "public",
            },
            sentAt: expect.any(String),
            type: "ready",
        });

        socket.close();

        expect(getActiveWebSocketCount()).toBe(0);
        expect(socket.getListenerCount("message")).toBe(0);
        expect(socket.getListenerCount("close")).toBe(0);
        expect(socket.getListenerCount("error")).toBe(0);
    });

    it("releases errored sockets and removes registered listeners", () => {
        const socket = createMockWebSocket();

        handleWebSocket(socket, publicWebSocketContext);
        socket.dispatchEvent(new Event("error"));

        expect(getActiveWebSocketCount()).toBe(0);
        expect(socket.getListenerCount("message")).toBe(0);
        expect(socket.getListenerCount("close")).toBe(0);
        expect(socket.getListenerCount("error")).toBe(0);
    });

    it("responds to ping messages", () => {
        const socket = createMockWebSocket();

        handleWebSocket(socket, publicWebSocketContext);
        socket.dispatchEvent(
            new MessageEvent("message", {
                data: JSON.stringify({
                    payload: {
                        timestamp: 456,
                    },
                    type: "ping",
                }),
            })
        );

        expect(parseSentMessage(socket, 1)).toEqual({
            payload: {
                timestamp: 456,
            },
            sentAt: expect.any(String),
            type: "pong",
        });

        socket.close();
    });

    it("responds to echo messages", () => {
        const socket = createMockWebSocket();

        handleWebSocket(socket, publicWebSocketContext);
        socket.dispatchEvent(
            new MessageEvent("message", {
                data: JSON.stringify({
                    payload: {
                        message: "hello",
                    },
                    type: "echo",
                }),
            })
        );

        expect(parseSentMessage(socket, 1)).toEqual({
            payload: {
                message: "hello",
            },
            sentAt: expect.any(String),
            type: "echo",
        });

        socket.close();
    });

    it("pushes five server messages every two seconds after a demo request", () => {
        vi.useFakeTimers();
        const socket = createMockWebSocket();

        handleWebSocket(socket, publicWebSocketContext);
        socket.dispatchEvent(
            new MessageEvent("message", {
                data: JSON.stringify({
                    payload: {
                        message: "服务端主动推送测试",
                    },
                    type: "serverPushDemo",
                }),
            })
        );

        vi.advanceTimersByTime(1999);

        expect(socket.sentMessages).toHaveLength(1);

        vi.advanceTimersByTime(1);

        expect(parseSentMessage(socket, 1)).toEqual({
            payload: {
                index: 1,
                message: "推送开始",
                total: 5,
            },
            sentAt: expect.any(String),
            type: "serverPush",
        });

        vi.advanceTimersByTime(8000);

        expect(socket.sentMessages).toHaveLength(6);
        expect(parseSentMessage(socket, 2)).toEqual({
            payload: {
                index: 2,
                message: "服务端主动推送 2/5",
                total: 5,
            },
            sentAt: expect.any(String),
            type: "serverPush",
        });
        expect(parseSentMessage(socket, 3)).toEqual({
            payload: {
                index: 3,
                message: "服务端主动推送 3/5",
                total: 5,
            },
            sentAt: expect.any(String),
            type: "serverPush",
        });
        expect(parseSentMessage(socket, 4)).toEqual({
            payload: {
                index: 4,
                message: "服务端主动推送 4/5",
                total: 5,
            },
            sentAt: expect.any(String),
            type: "serverPush",
        });
        expect(parseSentMessage(socket, 5)).toEqual({
            payload: {
                index: 5,
                message: "推送结束",
                total: 5,
            },
            sentAt: expect.any(String),
            type: "serverPush",
        });

        socket.close();
    });

    it("rejects duplicate server push demo requests while one is running", () => {
        vi.useFakeTimers();
        const socket = createMockWebSocket();

        handleWebSocket(socket, publicWebSocketContext);
        socket.dispatchEvent(
            new MessageEvent("message", {
                data: JSON.stringify({
                    type: "serverPushDemo",
                }),
            })
        );
        socket.dispatchEvent(
            new MessageEvent("message", {
                data: JSON.stringify({
                    type: "serverPushDemo",
                }),
            })
        );

        expect(parseSentMessage(socket, 1)).toEqual({
            payload: {
                message: "已有推送任务正在运行。",
            },
            sentAt: expect.any(String),
            type: "error",
        });

        socket.close();
    });

    it("clears pending server push demo timers after the socket closes", () => {
        vi.useFakeTimers();
        const socket = createMockWebSocket();

        handleWebSocket(socket, publicWebSocketContext);
        socket.dispatchEvent(
            new MessageEvent("message", {
                data: JSON.stringify({
                    type: "serverPushDemo",
                }),
            })
        );
        socket.close();

        vi.advanceTimersByTime(10000);

        expect(socket.sentMessages).toHaveLength(1);
        expect(getActiveWebSocketCount()).toBe(0);
    });

    it("disposes a server push demo when the socket is closed before the first tick", () => {
        vi.useFakeTimers();
        const sendMessage = vi.fn();
        const handler = createServerPushDemoHandler({
            isSocketOpen: () => false,
            sendError: vi.fn(),
            sendMessage,
        });

        handler.handle({
            type: "serverPushDemo",
        });
        vi.advanceTimersByTime(10_000);

        expect(sendMessage).not.toHaveBeenCalled();

        handler.handle({
            type: "serverPushDemo",
        });
        vi.advanceTimersByTime(2_000);

        expect(sendMessage).not.toHaveBeenCalled();
    });

    it("responds with errors for invalid messages", () => {
        const socket = createMockWebSocket();

        handleWebSocket(socket, publicWebSocketContext);
        socket.dispatchEvent(
            new MessageEvent("message", {
                data: JSON.stringify({
                    type: "unknown",
                }),
            })
        );

        expect(parseSentMessage(socket, 1)).toEqual({
            payload: {
                message: "Invalid WebSocket message.",
            },
            sentAt: expect.any(String),
            type: "error",
        });

        socket.close();
    });

    it("rejects public-only business messages on member connections", () => {
        const socket = createMockWebSocket();

        handleWebSocket(socket, memberWebSocketContext);
        socket.dispatchEvent(
            new MessageEvent("message", {
                data: JSON.stringify({
                    type: "serverPushDemo",
                }),
            })
        );

        expect(parseSentMessage(socket, 1)).toEqual({
            payload: {
                message: "Invalid WebSocket message.",
            },
            sentAt: expect.any(String),
            type: "error",
        });

        socket.close();
    });

    it("reports connection capacity from configured maximum connections", () => {
        vi.stubEnv("WEBSOCKET_MAX_CONNECTIONS", "1");
        const socket = createMockWebSocket();

        expect(canAcceptWebSocketConnection()).toBe(true);

        handleWebSocket(socket, publicWebSocketContext);

        expect(canAcceptWebSocketConnection()).toBe(false);

        socket.close();
    });

    it("closes idle sockets after the configured number of seconds", () => {
        vi.useFakeTimers();
        vi.stubEnv("WEBSOCKET_IDLE_TIMEOUT_SECONDS", "2");
        const socket = createMockWebSocket();

        handleWebSocket(socket, publicWebSocketContext);

        vi.advanceTimersByTime(1999);

        expect(socket.readyState).toBe(WebSocket.OPEN);
        expect(getActiveWebSocketCount()).toBe(1);

        vi.advanceTimersByTime(1);

        expect(socket.readyState).toBe(WebSocket.CLOSED);
        expect(socket.closeCode).toBe(1001);
        expect(socket.closeReason).toBe("Idle timeout.");
        expect(getActiveWebSocketCount()).toBe(0);
    });

    it("skips idle close when the socket is already closing and ignores duplicate releases", () => {
        vi.useFakeTimers();
        vi.stubEnv("WEBSOCKET_IDLE_TIMEOUT_SECONDS", "2");
        class StickyListenerWebSocket extends MockWebSocket {
            override removeEventListener() {}
        }
        const socket = new StickyListenerWebSocket() as unknown as WebSocket &
            StickyListenerWebSocket;

        handleWebSocket(socket, publicWebSocketContext);
        socket.readyState = WebSocket.CLOSING;

        vi.advanceTimersByTime(2000);

        expect(socket.closeCode).toBeUndefined();

        socket.close();
        socket.dispatchEvent(new Event("error"));

        expect(getActiveWebSocketCount()).toBe(0);
    });

    it("refreshes the idle timeout after receiving a message", () => {
        vi.useFakeTimers();
        vi.stubEnv("WEBSOCKET_IDLE_TIMEOUT_SECONDS", "2");
        const socket = createMockWebSocket();

        handleWebSocket(socket, publicWebSocketContext);
        vi.advanceTimersByTime(1500);
        socket.dispatchEvent(
            new MessageEvent("message", {
                data: JSON.stringify({
                    payload: {
                        timestamp: 456,
                    },
                    type: "ping",
                }),
            })
        );
        vi.advanceTimersByTime(1999);

        expect(socket.readyState).toBe(WebSocket.OPEN);
        expect(getActiveWebSocketCount()).toBe(1);

        vi.advanceTimersByTime(1);

        expect(socket.readyState).toBe(WebSocket.CLOSED);
        expect(getActiveWebSocketCount()).toBe(0);
    });
});

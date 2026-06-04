import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
    createWebSocketMessage,
    createWebSocketClientMessageSchema,
    parseWebSocketClientMessage,
    serializeWebSocketMessage,
    standardClientMessageSchema,
} from "@shanjing/astro-full-stack-starter/websocket/protocol/messages";
import { dispatchWebSocketMessage } from "@shanjing/astro-full-stack-starter/websocket/protocol/dispatcher";
import { adapter as memberWebSocketAdapter } from "@/websocket/adapters/member";
import { adapter as publicWebSocketAdapter } from "@/websocket/adapters/public";
import { adapter as superAdminWebSocketAdapter } from "@/websocket/adapters/super-admin";
import { createWebSocketBadRequestResponse } from "@shanjing/astro-full-stack-starter/websocket/responses";
import {
    createWebSocketForbiddenResponse,
    createWebSocketOriginForbiddenResponse,
    createWebSocketTooManyConnectionsResponse,
    createWebSocketUnauthorizedResponse,
    createWebSocketUpgradeRequiredResponse,
} from "@shanjing/astro-full-stack-starter/websocket/responses";
import {
    sendWebSocketError,
    sendWebSocketMessage,
} from "@shanjing/astro-full-stack-starter/websocket/sender";

class MockWebSocket extends EventTarget {
    readonly sentMessages: string[] = [];
    readyState: number = WebSocket.OPEN;

    send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
        this.sentMessages.push(String(data));
    }
}

describe("websocket messages", () => {
    it("parses ping messages", () => {
        const message = parseWebSocketClientMessage(
            JSON.stringify({
                payload: {
                    timestamp: 123,
                },
                type: "ping",
            }),
            standardClientMessageSchema
        );

        expect(message).toEqual({
            payload: {
                timestamp: 123,
            },
            type: "ping",
        });
    });

    it("parses server push demo messages", () => {
        const message = parseWebSocketClientMessage(
            JSON.stringify({
                payload: {
                    message: "服务端主动推送测试",
                },
                type: "serverPushDemo",
            }),
            publicWebSocketAdapter.endpoint.clientMessageSchema
        );

        expect(message).toEqual({
            payload: {
                message: "服务端主动推送测试",
            },
            type: "serverPushDemo",
        });
    });

    it("rejects invalid messages", () => {
        expect(() =>
            parseWebSocketClientMessage({ type: "ping" }, standardClientMessageSchema)
        ).toThrow("WebSocket message must be a JSON string.");
        expect(() =>
            parseWebSocketClientMessage("not json", standardClientMessageSchema)
        ).toThrow();
        expect(() =>
            parseWebSocketClientMessage(
                JSON.stringify({ type: "unknown" }),
                standardClientMessageSchema
            )
        ).toThrow();
    });

    it("rejects endpoint-specific messages outside their endpoint schema", () => {
        expect(() =>
            parseWebSocketClientMessage(
                JSON.stringify({
                    type: "serverPushDemo",
                }),
                memberWebSocketAdapter.endpoint.clientMessageSchema
            )
        ).toThrow();
    });

    it("serializes server messages with sentAt", () => {
        const message = createWebSocketMessage({
            payload: {
                message: "hello",
            },
            type: "echo",
        });

        expect(JSON.parse(serializeWebSocketMessage(message))).toEqual({
            payload: {
                message: "hello",
            },
            sentAt: expect.any(String),
            type: "echo",
        });
    });

    it("combines standard message schemas without endpoint-specific messages", () => {
        const schema = createWebSocketClientMessageSchema([]);

        expect(
            parseWebSocketClientMessage(
                JSON.stringify({
                    payload: {
                        message: "hello",
                    },
                    type: "echo",
                }),
                schema
            )
        ).toEqual({
            payload: {
                message: "hello",
            },
            type: "echo",
        });
    });

    it("dispatches standard, business, invalid, and malformed messages", () => {
        const sendError = vi.fn();
        const sendMessage = vi.fn();
        const handleMessage = vi.fn((message: { type: string }) => message.type === "business");

        dispatchWebSocketMessage(
            new MessageEvent("message", {
                data: JSON.stringify({
                    payload: {
                        timestamp: 123,
                    },
                    type: "ping",
                }),
            }),
            {
                clientMessageSchema: standardClientMessageSchema,
                handlers: {
                    dispose() {},
                    handleMessage,
                },
                sendError,
                sendMessage,
            }
        );
        dispatchWebSocketMessage(
            new MessageEvent("message", {
                data: JSON.stringify({
                    type: "business",
                }),
            }),
            {
                clientMessageSchema: createWebSocketClientMessageSchema([
                    z.object({
                        type: z.literal("business"),
                    }),
                ]),
                handlers: {
                    dispose() {},
                    handleMessage,
                },
                sendError,
                sendMessage,
            }
        );
        dispatchWebSocketMessage(
            new MessageEvent("message", {
                data: JSON.stringify({
                    type: "unknown",
                }),
            }),
            {
                clientMessageSchema: createWebSocketClientMessageSchema([
                    z.object({
                        type: z.literal("unknown"),
                    }),
                ]),
                handlers: {
                    dispose() {},
                    handleMessage: () => false,
                },
                sendError,
                sendMessage,
            }
        );
        dispatchWebSocketMessage(
            new MessageEvent("message", {
                data: "{bad-json",
            }),
            {
                clientMessageSchema: standardClientMessageSchema,
                handlers: {
                    dispose() {},
                    handleMessage,
                },
                sendError,
                sendMessage,
            }
        );

        expect(sendMessage).toHaveBeenCalledWith({
            payload: {
                timestamp: 123,
            },
            type: "pong",
        });
        expect(handleMessage).toHaveBeenCalledWith({
            type: "business",
        });
        expect(sendError).toHaveBeenCalledTimes(2);
        expect(sendError).toHaveBeenCalledWith("Invalid WebSocket message.");
    });

    it("returns false from endpoint handlers for unsupported business messages", () => {
        const handlerOptions = {
            isSocketOpen: () => true,
            sendError: vi.fn(),
            sendMessage: vi.fn(),
        };
        const publicHandlers = publicWebSocketAdapter.endpoint.createHandlers(
            {} as never,
            handlerOptions
        );
        const memberHandlers = memberWebSocketAdapter.endpoint.createHandlers(
            {} as never,
            handlerOptions
        );
        const superAdminHandlers = superAdminWebSocketAdapter.endpoint.createHandlers(
            {} as never,
            handlerOptions
        );

        expect(
            publicHandlers.handleMessage({
                payload: {
                    message: "hello",
                },
                type: "echo",
            })
        ).toBe(false);
        expect(memberHandlers.handleMessage({ type: "custom" })).toBe(false);
        expect(superAdminHandlers.handleMessage({ type: "custom" })).toBe(false);
        publicHandlers.dispose();
        memberHandlers.dispose();
        superAdminHandlers.dispose();
    });

    it("creates standard WebSocket HTTP responses", async () => {
        const upgradeRequired = createWebSocketUpgradeRequiredResponse();

        expect(upgradeRequired.status).toBe(426);
        expect(upgradeRequired.headers.get("upgrade")).toBe("websocket");
        await expect(createWebSocketBadRequestResponse("bad").text()).resolves.toBe("bad");
        await expect(createWebSocketUnauthorizedResponse("login").text()).resolves.toBe("login");
        await expect(createWebSocketForbiddenResponse("forbidden").text()).resolves.toBe(
            "forbidden"
        );
        await expect(createWebSocketOriginForbiddenResponse().text()).resolves.toBe(
            "WebSocket origin is forbidden."
        );
        expect(createWebSocketTooManyConnectionsResponse().status).toBe(429);
    });

    it("sends immediately, waits for connecting sockets, and ignores closed sockets", () => {
        const openSocket = new MockWebSocket() as unknown as WebSocket & MockWebSocket;

        sendWebSocketMessage(openSocket, {
            payload: {
                message: "hello",
            },
            type: "echo",
        });
        sendWebSocketError(openSocket, "failed");

        expect(openSocket.sentMessages).toHaveLength(2);
        expect(JSON.parse(openSocket.sentMessages[1] ?? "")).toEqual({
            payload: {
                message: "failed",
            },
            sentAt: expect.any(String),
            type: "error",
        });

        const connectingSocket = new MockWebSocket() as unknown as WebSocket & MockWebSocket;
        connectingSocket.readyState = WebSocket.CONNECTING;

        sendWebSocketMessage(connectingSocket, {
            payload: {
                message: "later",
            },
            type: "echo",
        });

        expect(connectingSocket.sentMessages).toHaveLength(0);
        connectingSocket.readyState = WebSocket.OPEN;
        connectingSocket.dispatchEvent(new Event("open"));
        expect(connectingSocket.sentMessages).toHaveLength(1);

        const closedSocket = new MockWebSocket() as unknown as WebSocket & MockWebSocket;
        closedSocket.readyState = WebSocket.CLOSED;

        sendWebSocketMessage(closedSocket, {
            payload: {
                message: "ignored",
            },
            type: "echo",
        });

        expect(closedSocket.sentMessages).toHaveLength(0);
    });
});

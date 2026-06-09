import { describe, expect, it, vi } from "vitest";

import { parseWebSocketClientMessage } from "@shanjing/astro-full-stack-starter/websocket/protocol/messages";
import { adapter as memberWebSocketAdapter } from "@/websocket/adapters/member";
import { adapter as publicWebSocketAdapter } from "@/websocket/adapters/public";
import { adapter as adminWebSocketAdapter } from "@/websocket/adapters/admin";

vi.mock("@/observability/sentry", () => ({
    reportException: vi.fn(),
    reportMessage: vi.fn(),
}));

describe("Cloudflare D1 WebSocket messages", () => {
    it("uses a Durable Object driver for the public endpoint", () => {
        expect(publicWebSocketAdapter.cloudflare).toEqual({
            driver: "durableObject",
            durableObject: {
                binding: "WEBSOCKET_ROOM",
                hibernation: true,
                room: "public-demo",
            },
        });
    });

    it("keeps protected endpoints on the WebSocketPair driver", () => {
        expect(memberWebSocketAdapter.cloudflare).toEqual({
            driver: "webSocketPair",
        });
        expect(adminWebSocketAdapter.cloudflare).toEqual({
            driver: "webSocketPair",
        });
    });

    it("parses public server push demo messages", () => {
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

    it("keeps endpoint-specific messages scoped to the public endpoint", () => {
        expect(() =>
            parseWebSocketClientMessage(
                JSON.stringify({
                    type: "serverPushDemo",
                }),
                memberWebSocketAdapter.endpoint.clientMessageSchema
            )
        ).toThrow();
    });

    it("creates endpoint handlers for public, member, and admin endpoints", () => {
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
        const adminHandlers = adminWebSocketAdapter.endpoint.createHandlers(
            {} as never,
            handlerOptions
        );

        expect(
            publicHandlers.handleMessage({
                payload: {
                    message: "服务端主动推送测试",
                },
                type: "serverPushDemo",
            })
        ).toBe(true);
        expect(memberHandlers.handleMessage({ type: "custom" })).toBe(false);
        expect(adminHandlers.handleMessage({ type: "custom" })).toBe(false);

        publicHandlers.dispose();
        memberHandlers.dispose();
        adminHandlers.dispose();
    });
});

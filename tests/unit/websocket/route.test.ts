import { afterEach, describe, expect, it, vi } from "vitest";

import { createNamedWebSocketEndpoint } from "@shanjing/astro-full-stack-starter/websocket/adapter";
import { createWebSocketRoute } from "@shanjing/astro-full-stack-starter/websocket/route";
import { handleWebSocket } from "@shanjing/astro-full-stack-starter/websocket/server";
import { adapter as publicWebSocketAdapter } from "@/websocket/adapters/public";

import type { APIRoute } from "astro";

class MockWebSocket extends EventTarget {
    readonly sentMessages: string[] = [];
    readyState: number = WebSocket.OPEN;

    close() {
        this.readyState = WebSocket.CLOSED;
        this.dispatchEvent(new Event("close"));
    }

    send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
        this.sentMessages.push(String(data));
    }
}

function createMockWebSocket() {
    return new MockWebSocket() as unknown as WebSocket & MockWebSocket;
}

function createRouteContext(options: {
    isUpgradeRequest?: boolean;
    origin?: string;
    socket?: WebSocket;
    upgradeError?: Error;
}) {
    const headers = new Headers();
    const socket = options.socket ?? createMockWebSocket();
    const response = new Response("upgraded");
    const upgradeWebSocket = vi.fn(() => {
        if (options.upgradeError) {
            throw options.upgradeError;
        }

        return {
            response,
            socket,
        };
    });

    if (options.origin) {
        headers.set("origin", options.origin);
    }

    return {
        context: {
            locals: {
                isUpgradeRequest: options.isUpgradeRequest ?? true,
                session: null,
                upgradeWebSocket,
                user: null,
            },
            request: new Request("https://api.example.com/api/websocket/public", {
                headers,
            }),
            url: new URL("https://api.example.com/api/websocket/public"),
        } as unknown as Parameters<APIRoute>[0],
        response,
        socket,
        upgradeWebSocket,
    };
}

const publicWebSocketEndpoint = createNamedWebSocketEndpoint("public", publicWebSocketAdapter);

describe("websocket route", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.useRealTimers();
    });

    it("returns upgrade required responses for non-upgrade requests", async () => {
        const route = createWebSocketRoute(publicWebSocketEndpoint);
        const { context, upgradeWebSocket } = createRouteContext({
            isUpgradeRequest: false,
            origin: "https://app.example.com",
        });

        const response = await route(context);

        expect(response.status).toBe(426);
        expect(upgradeWebSocket).not.toHaveBeenCalled();
    });

    it("rejects forbidden origins before upgrading", async () => {
        vi.stubEnv("DEV", false);
        vi.stubEnv("WEBSOCKET_ALLOWED_ORIGINS", "https://app.example.com");
        const route = createWebSocketRoute(publicWebSocketEndpoint);
        const { context, upgradeWebSocket } = createRouteContext({
            origin: "https://other.example.com",
        });

        const response = await route(context);

        expect(response.status).toBe(403);
        expect(await response.text()).toBe("WebSocket origin is forbidden.");
        expect(upgradeWebSocket).not.toHaveBeenCalled();
    });

    it("returns bad request responses when the WebSocket upgrade fails", async () => {
        vi.stubEnv("DEV", false);
        vi.stubEnv("WEBSOCKET_ALLOWED_ORIGINS", "https://app.example.com");
        const route = createWebSocketRoute(publicWebSocketEndpoint);
        const { context, upgradeWebSocket } = createRouteContext({
            origin: "https://app.example.com",
            upgradeError: new Error("Invalid upgrade request."),
        });

        const response = await route(context);

        expect(response.status).toBe(400);
        expect(await response.text()).toBe("Invalid WebSocket upgrade request.");
        expect(upgradeWebSocket).toHaveBeenCalledOnce();
    });

    it("rejects connections when the active connection limit is reached", async () => {
        vi.stubEnv("DEV", false);
        vi.stubEnv("WEBSOCKET_ALLOWED_ORIGINS", "https://app.example.com");
        vi.stubEnv("WEBSOCKET_MAX_CONNECTIONS", "1");
        const activeSocket = createMockWebSocket();
        const route = createWebSocketRoute(publicWebSocketEndpoint);
        const { context, upgradeWebSocket } = createRouteContext({
            origin: "https://app.example.com",
        });

        handleWebSocket(activeSocket, {
            endpoint: publicWebSocketEndpoint,
            session: null,
            user: null,
        });

        const response = await route(context);

        expect(response.status).toBe(429);
        expect(await response.text()).toBe("Too many WebSocket connections.");
        expect(upgradeWebSocket).not.toHaveBeenCalled();

        activeSocket.close();
    });

    it("upgrades and registers valid connections", async () => {
        vi.stubEnv("DEV", false);
        vi.stubEnv("WEBSOCKET_ALLOWED_ORIGINS", "https://app.example.com");
        const route = createWebSocketRoute(publicWebSocketEndpoint);
        const socket = createMockWebSocket();
        const { context, response, upgradeWebSocket } = createRouteContext({
            origin: "https://app.example.com",
            socket,
        });

        const result = await route(context);

        expect(result).toBe(response);
        expect(upgradeWebSocket).toHaveBeenCalledOnce();
        expect(socket.sentMessages).toHaveLength(1);

        socket.close();
    });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import {
    getAllowedWebSocketOrigins,
    getWebSocketIdleTimeoutMs,
    getWebSocketMaxConnections,
    isAllowedWebSocketOrigin,
} from "@shanjing/astro-full-stack-starter/websocket/config";

describe("websocket config", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("uses default connection and idle timeout settings", () => {
        expect(getWebSocketMaxConnections()).toBe(100);
        expect(getWebSocketIdleTimeoutMs()).toBe(60000);
    });

    it("uses env connection and idle timeout settings", () => {
        vi.stubEnv("WEBSOCKET_MAX_CONNECTIONS", "25");
        vi.stubEnv("WEBSOCKET_IDLE_TIMEOUT_SECONDS", "15");

        expect(getWebSocketMaxConnections()).toBe(25);
        expect(getWebSocketIdleTimeoutMs()).toBe(15000);
    });

    it("rejects invalid numeric settings", () => {
        vi.stubEnv("WEBSOCKET_MAX_CONNECTIONS", "0");

        expect(() => getWebSocketMaxConnections()).toThrow(
            "WEBSOCKET_MAX_CONNECTIONS must be a positive integer."
        );

        vi.stubEnv("WEBSOCKET_MAX_CONNECTIONS", "100");
        vi.stubEnv("WEBSOCKET_IDLE_TIMEOUT_SECONDS", "1.5");

        expect(() => getWebSocketIdleTimeoutMs()).toThrow(
            "WEBSOCKET_IDLE_TIMEOUT_SECONDS must be a positive integer."
        );
    });

    it("normalizes configured allowed origins", () => {
        vi.stubEnv("WEBSOCKET_ALLOWED_ORIGINS", "https://example.com/path,http://localhost:4321/");

        expect(getAllowedWebSocketOrigins()).toEqual([
            "https://example.com",
            "http://localhost:4321",
        ]);
    });

    it("throws for invalid configured allowed origins", () => {
        vi.stubEnv("WEBSOCKET_ALLOWED_ORIGINS", "not a valid origin");

        expect(() => getAllowedWebSocketOrigins()).toThrow(
            "Invalid WebSocket origin: not a valid origin"
        );
    });

    it("allows only configured origins when an allowed list exists", () => {
        vi.stubEnv("WEBSOCKET_ALLOWED_ORIGINS", "https://app.example.com");
        vi.stubEnv("DEV", false);

        expect(
            isAllowedWebSocketOrigin(
                "https://app.example.com",
                new URL("https://api.example.com/api/websocket/public")
            )
        ).toBe(true);
        expect(
            isAllowedWebSocketOrigin(
                "https://other.example.com",
                new URL("https://api.example.com/api/websocket/public")
            )
        ).toBe(false);
    });

    it("rejects invalid request origins without throwing", () => {
        vi.stubEnv("WEBSOCKET_ALLOWED_ORIGINS", "https://app.example.com");
        vi.stubEnv("DEV", false);

        expect(
            isAllowedWebSocketOrigin(
                "not a valid origin",
                new URL("https://api.example.com/api/websocket/public")
            )
        ).toBe(false);
    });

    it("rejects missing production origins when no allowed list exists", () => {
        vi.stubEnv("DEV", false);

        expect(
            isAllowedWebSocketOrigin(null, new URL("https://api.example.com/api/websocket/public"))
        ).toBe(false);
    });

    it("allows missing origins in development", () => {
        vi.stubEnv("DEV", true);

        expect(
            isAllowedWebSocketOrigin(null, new URL("http://localhost:4321/api/websocket/public"))
        ).toBe(true);
    });

    it("allows same-origin production origins when no allowed list exists", () => {
        vi.stubEnv("DEV", false);

        expect(
            isAllowedWebSocketOrigin(
                "https://api.example.com",
                new URL("https://api.example.com/api/websocket/public")
            )
        ).toBe(true);
        expect(
            isAllowedWebSocketOrigin(
                "https://app.example.com",
                new URL("https://api.example.com/api/websocket/public")
            )
        ).toBe(false);
    });

    it("allows localhost origins in development without an allowed list", () => {
        vi.stubEnv("DEV", true);

        expect(
            isAllowedWebSocketOrigin(
                "http://localhost:3000",
                new URL("http://localhost:4321/api/websocket/public")
            )
        ).toBe(true);
    });

    it("allows localhost origins in development with a configured origin list", () => {
        vi.stubEnv("DEV", true);
        vi.stubEnv("WEBSOCKET_ALLOWED_ORIGINS", "http://localhost:4321");

        expect(
            isAllowedWebSocketOrigin(
                "http://localhost:4322",
                new URL("http://localhost:4322/api/websocket/public")
            )
        ).toBe(true);
    });
});

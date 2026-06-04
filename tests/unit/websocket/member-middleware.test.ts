import { describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
    getAuth: () => ({
        api: {
            getSession: getSessionMock,
        },
    }),
}));

describe("Cloudflare D1 member WebSocket middleware", () => {
    it("returns 401 when the member WebSocket session is missing", async () => {
        getSessionMock.mockResolvedValueOnce(null);
        const { onRequest } = await import("@/middleware/member");
        const context = {
            locals: {},
            request: new Request("https://app.example.com/api/websocket/member"),
            url: new URL("https://app.example.com/api/websocket/member"),
        };
        const next = vi.fn(async () => new Response("next"));

        const response = (await onRequest(context as never, next)) as Response;

        expect(response.status).toBe(401);
        await expect(response.text()).resolves.toBe("WebSocket session is required.");
        expect(context.locals).toEqual({
            session: null,
            user: null,
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("stores the session and user locals before continuing", async () => {
        getSessionMock.mockResolvedValueOnce({
            session: {
                id: "session-1",
            },
            user: {
                id: "user-1",
            },
        });
        const { onRequest } = await import("@/middleware/member");
        const context = {
            locals: {},
            request: new Request("https://app.example.com/api/websocket/member"),
            url: new URL("https://app.example.com/api/websocket/member"),
        };
        const next = vi.fn(async () => new Response("next"));

        const response = (await onRequest(context as never, next)) as Response;

        expect(response.status).toBe(200);
        expect(context.locals).toEqual({
            session: {
                id: "session-1",
            },
            user: {
                id: "user-1",
            },
        });
        expect(next).toHaveBeenCalledOnce();
    });
});

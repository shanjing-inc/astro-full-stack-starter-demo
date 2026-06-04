import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    betterAuthMock,
    createCloudflareD1DatabaseProviderMock,
    drizzleAdapterMock,
    getCloudflareD1EnvMock,
} = vi.hoisted(() => ({
    betterAuthMock: vi.fn((config: unknown) => ({ config })),
    createCloudflareD1DatabaseProviderMock: vi.fn(() => ({
        getDb: () => "d1-db-client",
    })),
    drizzleAdapterMock: vi.fn(() => "drizzle-adapter"),
    getCloudflareD1EnvMock: vi.fn(() => ({
        BETTER_AUTH_ALLOWED_HOSTS: "localhost:*,127.0.0.1:*",
        BETTER_AUTH_SECRET: "cloudflare-d1-demo-local-secret-please-change",
    })),
}));

vi.mock("better-auth", () => ({
    betterAuth: betterAuthMock,
}));

vi.mock("better-auth/adapters/drizzle", () => ({
    drizzleAdapter: drizzleAdapterMock,
}));

vi.mock("better-auth/plugins/admin", () => ({
    admin: vi.fn(() => "admin-plugin"),
}));

vi.mock("better-auth/plugins/bearer", () => ({
    bearer: vi.fn(() => "bearer-plugin"),
}));

vi.mock("@/db/client", () => ({
    createCloudflareD1DatabaseProvider: createCloudflareD1DatabaseProviderMock,
    getCloudflareD1Env: getCloudflareD1EnvMock,
}));

vi.mock("@/db/relations", () => ({
    dbSchema: "d1-db-schema",
}));

describe("Cloudflare D1 auth runtime config", () => {
    beforeEach(() => {
        vi.resetModules();
        betterAuthMock.mockClear();
        createCloudflareD1DatabaseProviderMock.mockClear();
        drizzleAdapterMock.mockClear();
        getCloudflareD1EnvMock.mockClear();
    });

    it("uses Better Auth email/password with the D1 Drizzle adapter", async () => {
        vi.stubEnv("BETTER_AUTH_ALLOWED_HOSTS", "example.com, localhost:* ");
        vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-with-at-least-32-characters");

        const { auth, getAuth } = await import("@/lib/auth");

        expect(createCloudflareD1DatabaseProviderMock).toHaveBeenCalledWith(
            expect.objectContaining({
                BETTER_AUTH_ALLOWED_HOSTS: "localhost:*,127.0.0.1:*",
            })
        );
        expect(drizzleAdapterMock).toHaveBeenCalledWith("d1-db-client", {
            provider: "sqlite",
            schema: "d1-db-schema",
        });
        expect(betterAuthMock).toHaveBeenCalledWith(
            expect.objectContaining({
                baseURL: {
                    allowedHosts: ["example.com", "localhost:*"],
                },
                emailAndPassword: expect.objectContaining({
                    enabled: true,
                    password: expect.objectContaining({
                        hash: expect.any(Function),
                        verify: expect.any(Function),
                    }),
                }),
                secret: "test-secret-with-at-least-32-characters",
            })
        );
        expect(getAuth()).toBe(auth);
    });

    it("falls back to Cloudflare env bindings for required auth config", async () => {
        await import("@/lib/auth");

        expect(betterAuthMock).toHaveBeenCalledWith(
            expect.objectContaining({
                baseURL: {
                    allowedHosts: ["localhost:*", "127.0.0.1:*"],
                },
                secret: "cloudflare-d1-demo-local-secret-please-change",
            })
        );
    });

    it("throws when required auth config is missing", async () => {
        getCloudflareD1EnvMock.mockReturnValue({} as never);

        await expect(import("@/lib/auth")).rejects.toThrow(
            "Missing required environment variable: BETTER_AUTH_ALLOWED_HOSTS"
        );
    });
});

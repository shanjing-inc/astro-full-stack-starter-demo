import { beforeEach, describe, expect, it, vi } from "vitest";

const { betterAuthMock, drizzleAdapterMock } = vi.hoisted(() => ({
    betterAuthMock: vi.fn((config: unknown) => ({ config })),
    drizzleAdapterMock: vi.fn(() => "drizzle-adapter"),
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
    databaseProvider: {
        dialect: "mysql",
        getDb: () => "db-client",
        schema: "db-schema",
    },
}));

describe("auth runtime config", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
        betterAuthMock.mockClear();
        drizzleAdapterMock.mockClear();
    });

    it("reads required auth config from runtime env", async () => {
        vi.stubEnv("BETTER_AUTH_ALLOWED_HOSTS", "example.com, localhost:* ");
        vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-with-at-least-32-characters");

        const { auth, getAuth } = await import("@/lib/auth");

        expect(betterAuthMock).toHaveBeenCalledWith(
            expect.objectContaining({
                baseURL: {
                    allowedHosts: ["example.com", "localhost:*"],
                },
                secret: "test-secret-with-at-least-32-characters",
            })
        );
        expect(drizzleAdapterMock).toHaveBeenCalledWith("db-client", {
            provider: "mysql",
            schema: "db-schema",
        });
        expect(getAuth()).toBe(auth);
    });

    it("throws when allowed hosts are missing", async () => {
        vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-with-at-least-32-characters");

        await expect(import("@/lib/auth")).rejects.toThrow(
            "Missing required environment variable: BETTER_AUTH_ALLOWED_HOSTS"
        );
    });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { adminMock, betterAuthMock, drizzleAdapterMock } = vi.hoisted(() => ({
    adminMock: vi.fn((_config: unknown) => "admin-plugin"),
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
    admin: adminMock,
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

type AccessRole = {
    statements: Record<string, string[]>;
};

type AdminPluginConfig = {
    roles: {
        admin: AccessRole;
        member: AccessRole;
        owner: AccessRole;
        user: AccessRole;
    };
};

describe("auth runtime config", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
        adminMock.mockClear();
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
        expect(adminMock).toHaveBeenCalledWith({
            roles: {
                admin: expect.anything(),
                member: expect.anything(),
                owner: expect.anything(),
                user: expect.anything(),
            },
        });
        expect(getAuth()).toBe(auth);
    });

    it("allows owner, admin, and member roles to access their dashboard entries", async () => {
        vi.stubEnv("BETTER_AUTH_ALLOWED_HOSTS", "localhost:*");
        vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-with-at-least-32-characters");

        await import("@/lib/auth");

        const adminConfig = adminMock.mock.calls.at(-1)?.[0] as AdminPluginConfig;

        expect(adminConfig.roles.admin.statements.dashboard).toEqual([
            "access:admin",
            "access:member",
        ]);
        expect(adminConfig.roles.owner.statements.dashboard).toEqual([
            "access:admin",
            "access:member",
        ]);
        expect(adminConfig.roles.owner.statements.system).toEqual(["owner"]);
        expect(adminConfig.roles.admin.statements.system).toEqual([]);
        expect(adminConfig.roles.member.statements.dashboard).toEqual(["access:member"]);
        expect(adminConfig.roles.user.statements.dashboard).toEqual([]);
    });

    it("throws when allowed hosts are missing", async () => {
        vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-with-at-least-32-characters");

        await expect(import("@/lib/auth")).rejects.toThrow(
            "Missing required environment variable: BETTER_AUTH_ALLOWED_HOSTS"
        );
    });
});

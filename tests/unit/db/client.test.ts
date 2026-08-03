import { beforeEach, describe, expect, it, vi } from "vitest";

const { connectionMock, createPoolMock, drizzleMock, poolMock } = vi.hoisted(() => {
    function createConnectionMethod(methodName: "execute" | "query") {
        return vi.fn(function connectionMethod(this: unknown) {
            if (this !== connection) {
                throw new Error(`${methodName} called without connection context`);
            }

            return Promise.resolve([[], []]);
        });
    }

    const connection = {
        connection: { label: "physical-connection" },
        execute: createConnectionMethod("execute"),
        query: createConnectionMethod("query"),
        release: vi.fn(),
    };
    const pool = {
        execute: vi.fn(() => Promise.resolve([[], []])),
        getConnection: vi.fn(() => Promise.resolve(connection)),
        query: vi.fn(() => Promise.resolve([[], []])),
    };

    return {
        connectionMock: connection,
        createPoolMock: vi.fn(() => pool),
        drizzleMock: vi.fn((..._args: unknown[]) => "drizzle-db"),
        poolMock: pool,
    };
});

vi.mock("mysql2/promise", () => ({
    createPool: createPoolMock,
}));

vi.mock("drizzle-orm/mysql2", () => ({
    drizzle: drizzleMock,
}));

describe("database client runtime config", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
        connectionMock.execute.mockClear();
        connectionMock.query.mockClear();
        connectionMock.release.mockClear();
        createPoolMock.mockClear();
        drizzleMock.mockClear();
        poolMock.execute = vi.fn(() => Promise.resolve([[], []]));
        poolMock.getConnection = vi.fn(() => Promise.resolve(connectionMock));
        poolMock.query = vi.fn(() => Promise.resolve([[], []]));
        delete (globalThis as { __mysqlDb_default__?: unknown }).__mysqlDb_default__;
        delete (globalThis as { __mysqlPool_default__?: unknown }).__mysqlPool_default__;
        delete (globalThis as { __mysqlDb__?: unknown }).__mysqlDb__;
        delete (globalThis as { __mysqlPool__?: unknown }).__mysqlPool__;
    });

    it("extracts mysql pool options from DATABASE_URL query parameters", async () => {
        vi.stubEnv("TZ", "UTC");
        vi.stubEnv(
            "DATABASE_URL",
            [
                "mysql://user:pass@127.0.0.1:3306/app",
                "?connectionLimit=30",
                "&maxIdle=20",
                "&idleTimeout=7000",
                "&queueLimit=200",
                "&waitForConnections=false",
                "&resetOnRelease=true",
                "&charset=utf8mb4",
            ].join("")
        );

        const { getDb, getMysqlPool } = await import("@/db/client");

        expect(createPoolMock).not.toHaveBeenCalled();

        getMysqlPool();
        getDb();

        expect(createPoolMock).toHaveBeenCalledWith({
            connectionLimit: 30,
            dateStrings: ["DATETIME", "TIMESTAMP"],
            idleTimeout: 7000,
            maxIdle: 20,
            queueLimit: 200,
            resetOnRelease: true,
            supportBigNumbers: true,
            timezone: "Z",
            uri: "mysql://user:pass@127.0.0.1:3306/app?charset=utf8mb4",
            waitForConnections: false,
        });
        // drizzle-orm 1.0 RC mysql2 driver is relations-first; mode is no longer consumed.
        expect(drizzleMock).toHaveBeenCalledWith(
            expect.objectContaining({
                client: poolMock,
                relations: expect.anything(),
            })
        );
        const drizzleConfig = drizzleMock.mock.calls.at(0)?.[0] as
            Record<string, unknown> | undefined;
        expect(drizzleConfig).toBeDefined();
        expect(drizzleConfig).not.toHaveProperty("mode");
        expect(drizzleConfig).not.toHaveProperty("schema");
    });

    it("creates drizzle without mode when DATABASE_URL omits drizzleMode", async () => {
        vi.stubEnv("TZ", "UTC");
        vi.stubEnv(
            "DATABASE_URL",
            [
                "mysql://user:pass@127.0.0.1:3306/app",
                "?connectionLimit=30",
                "&maxIdle=20",
                "&idleTimeout=7000",
                "&queueLimit=200",
                "&waitForConnections=false",
                "&resetOnRelease=true",
                "&charset=utf8mb4",
            ].join("")
        );

        const { getDb, getMysqlPool } = await import("@/db/client");

        expect(createPoolMock).not.toHaveBeenCalled();

        getMysqlPool();
        getDb();

        expect(createPoolMock).toHaveBeenCalledWith({
            connectionLimit: 30,
            dateStrings: ["DATETIME", "TIMESTAMP"],
            idleTimeout: 7000,
            maxIdle: 20,
            queueLimit: 200,
            resetOnRelease: true,
            supportBigNumbers: true,
            timezone: "Z",
            uri: "mysql://user:pass@127.0.0.1:3306/app?charset=utf8mb4",
            waitForConnections: false,
        });
        expect(drizzleMock).toHaveBeenCalledWith(
            expect.objectContaining({
                client: poolMock,
                relations: expect.anything(),
            })
        );
        const drizzleConfig = drizzleMock.mock.calls.at(0)?.[0] as
            Record<string, unknown> | undefined;
        expect(drizzleConfig).toBeDefined();
        expect(drizzleConfig).not.toHaveProperty("mode");
        expect(drizzleConfig).not.toHaveProperty("schema");
    });

    it("rejects invalid mysql pool query parameters", async () => {
        vi.stubEnv("DATABASE_URL", "mysql://user:pass@127.0.0.1:3306/app?connectionLimit=0");

        const { getMysqlPool } = await import("@/db/client");

        expect(() => getMysqlPool()).toThrow(
            "DATABASE_URL MySQL query parameter connectionLimit must be greater than 0."
        );
    });

    it("rejects the removed PlanetScale drizzle mode", async () => {
        vi.stubEnv("DATABASE_URL", "mysql://user:pass@127.0.0.1:3306/app?drizzleMode=planetscale");

        const { getMysqlPool } = await import("@/db/client");

        expect(() => getMysqlPool()).toThrow(
            "DATABASE_URL MySQL query parameter drizzleMode=planetscale is no longer supported. Remove drizzleMode from DATABASE_URL."
        );
    });

    it("sets every physical mysql connection to UTC when TZ is UTC", async () => {
        vi.stubEnv("DATABASE_URL", "mysql://user:pass@127.0.0.1:3306/app");
        vi.stubEnv("TZ", "UTC");

        const { getMysqlPool } = await import("@/db/client");
        const mysqlPool = getMysqlPool();

        await mysqlPool.query("SELECT 1");

        expect(connectionMock.query).toHaveBeenNthCalledWith(1, "SET time_zone = '+00:00'");
        expect(connectionMock.query).toHaveBeenNthCalledWith(2, "SELECT 1");
        expect(connectionMock.release).toHaveBeenCalledOnce();
    });

    it("uses UTC for MySQL storage timezone when TZ is omitted", async () => {
        vi.stubEnv("DATABASE_URL", "mysql://user:pass@127.0.0.1:3306/app");
        vi.stubEnv("TZ", "");

        const { getMysqlPool } = await import("@/db/client");
        const mysqlPool = getMysqlPool();

        await mysqlPool.query("SELECT 1");

        expect(connectionMock.query).toHaveBeenNthCalledWith(1, "SET time_zone = '+00:00'");
        expect(connectionMock.query).toHaveBeenNthCalledWith(2, "SELECT 1");
        expect(connectionMock.release).toHaveBeenCalledOnce();
    });

    it("uses UTC for MySQL storage timezone when TZ is an UTC alias", async () => {
        vi.stubEnv("DATABASE_URL", "mysql://user:pass@127.0.0.1:3306/app");
        vi.stubEnv("TZ", "Etc/UTC");

        const { getMysqlPool } = await import("@/db/client");
        const mysqlPool = getMysqlPool();

        await mysqlPool.query("SELECT 1");

        expect(connectionMock.query).toHaveBeenNthCalledWith(1, "SET time_zone = '+00:00'");
        expect(connectionMock.query).toHaveBeenNthCalledWith(2, "SELECT 1");
        expect(connectionMock.release).toHaveBeenCalledOnce();
    });

    it("uses TZ for MySQL session time zone", async () => {
        vi.stubEnv("DATABASE_URL", "mysql://user:pass@127.0.0.1:3306/app?charset=utf8mb4");
        vi.stubEnv("TZ", "Asia/Shanghai");

        const { getMysqlPool } = await import("@/db/client");
        const mysqlPool = getMysqlPool();

        await mysqlPool.execute("SELECT 1");

        expect(createPoolMock).toHaveBeenCalledWith({
            dateStrings: ["DATETIME", "TIMESTAMP"],
            supportBigNumbers: true,
            timezone: "local",
            uri: "mysql://user:pass@127.0.0.1:3306/app?charset=utf8mb4",
        });
        expect(connectionMock.query).toHaveBeenCalledWith("SET time_zone = 'Asia/Shanghai'");
        expect(connectionMock.execute).toHaveBeenCalledWith("SELECT 1");
        expect(connectionMock.release).toHaveBeenCalledOnce();
    });

    it("wraps MySQL session time zone initialization failures as configuration errors", async () => {
        const { initializeMysqlTimeZoneSession } =
            await import("@shanjing/astro-full-stack-starter/db/mysql/client");
        const connection = {
            query: vi.fn(() => Promise.reject(new Error("Unknown time zone"))),
        };

        await expect(
            initializeMysqlTimeZoneSession(connection, "SET time_zone = 'Asia/Shanghai'")
        ).rejects.toThrow(
            "Failed to initialize MySQL session time zone with \"SET time_zone = 'Asia/Shanghai'\"."
        );
    });

    it("releases checked-out connections when MySQL session time zone initialization fails", async () => {
        vi.stubEnv("DATABASE_URL", "mysql://user:pass@127.0.0.1:3306/app");
        vi.stubEnv("TZ", "Asia/Shanghai");
        connectionMock.query.mockRejectedValueOnce(new Error("Unknown time zone"));

        const { getMysqlPool } = await import("@/db/client");
        const mysqlPool = getMysqlPool();

        await expect(mysqlPool.query("SELECT 1")).rejects.toThrow(
            "Failed to initialize MySQL session time zone with \"SET time_zone = 'Asia/Shanghai'\"."
        );
        expect(connectionMock.query).toHaveBeenCalledOnce();
        expect(connectionMock.release).toHaveBeenCalledOnce();
    });

    it("rejects timezone from DATABASE_URL", async () => {
        vi.stubEnv("DATABASE_URL", "mysql://user:pass@127.0.0.1:3306/app?timezone=Asia%2FShanghai");

        const { getMysqlPool } = await import("@/db/client");

        expect(() => getMysqlPool()).toThrow(
            "DATABASE_URL MySQL query parameter timezone has been removed. Set TZ to control MySQL DATETIME/TIMESTAMP storage timezone."
        );
    });
});

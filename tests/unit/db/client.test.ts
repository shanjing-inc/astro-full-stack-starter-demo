import { beforeEach, describe, expect, it, vi } from "vitest";

const { createPoolMock, drizzleMock } = vi.hoisted(() => ({
    createPoolMock: vi.fn(() => "mysql-pool"),
    drizzleMock: vi.fn(() => "drizzle-db"),
}));

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
        createPoolMock.mockClear();
        drizzleMock.mockClear();
        delete (globalThis as { __mysqlDb_default__?: unknown }).__mysqlDb_default__;
        delete (globalThis as { __mysqlPool_default__?: unknown }).__mysqlPool_default__;
        delete (globalThis as { __mysqlDb__?: unknown }).__mysqlDb__;
        delete (globalThis as { __mysqlPool__?: unknown }).__mysqlPool__;
    });

    it("extracts mysql pool options from MYSQL_URL query parameters", async () => {
        vi.stubEnv(
            "MYSQL_URL",
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

        const { getMysqlPool } = await import("@/db/client");

        expect(createPoolMock).not.toHaveBeenCalled();

        getMysqlPool();

        expect(createPoolMock).toHaveBeenCalledWith({
            connectionLimit: 30,
            idleTimeout: 7000,
            maxIdle: 20,
            queueLimit: 200,
            resetOnRelease: true,
            uri: "mysql://user:pass@127.0.0.1:3306/app?charset=utf8mb4",
            waitForConnections: false,
        });
    });

    it("rejects invalid mysql pool query parameters", async () => {
        vi.stubEnv("MYSQL_URL", "mysql://user:pass@127.0.0.1:3306/app?connectionLimit=0");

        const { getMysqlPool } = await import("@/db/client");

        expect(() => getMysqlPool()).toThrow(
            "MYSQL_URL query parameter connectionLimit must be greater than 0."
        );
    });
});

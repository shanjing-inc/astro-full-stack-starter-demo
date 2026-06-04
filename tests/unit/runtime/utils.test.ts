import { afterEach, describe, expect, it, vi } from "vitest";

import {
    createGraphqlErrorResponse,
    serializeDateTime,
} from "@shanjing/astro-full-stack-starter/graphql/utils";
import { cn, getInitials } from "@/lib/utils";
import {
    getEnvVar,
    resolvePositiveIntegerEnv,
    RuntimeConfigurationError,
} from "@shanjing/astro-full-stack-starter/runtime/env";
import {
    getPm2InstanceId,
    getPm2InstanceName,
    getProcessId,
} from "@shanjing/astro-full-stack-starter/runtime/process";

describe("shared runtime and utility helpers", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    it("merges class names and Tailwind conflicts", () => {
        expect(cn("px-2 text-sm", false, ["px-4"])).toBe("text-sm px-4");
    });

    it("creates initials from names, emails, and fallbacks", () => {
        expect(getInitials(" fengit ", "demo@example.com")).toBe("FE");
        expect(getInitials("", "demo@example.com")).toBe("DE");
        expect(getInitials(null, null)).toBe("U");
    });

    it("serializes dates and keeps string date values unchanged", () => {
        expect(serializeDateTime("2026-05-07T00:00:00.000Z")).toBe("2026-05-07T00:00:00.000Z");
        expect(serializeDateTime(new Date("2026-05-07T00:00:00.000Z"))).toBe(
            "2026-05-07T00:00:00.000Z"
        );
    });

    it("creates GraphQL-style JSON error responses", async () => {
        const response = createGraphqlErrorResponse("Forbidden", 403);

        await expect(response.json()).resolves.toEqual({
            errors: [
                {
                    message: "Forbidden",
                },
            ],
        });
        expect(response.status).toBe(403);
    });

    it("reads environment values from process and Deno fallbacks", () => {
        expect(getEnvVar("MODE")).toBeDefined();

        vi.stubEnv("MYSQL_URL", "mysql://user:pass@localhost:3306/app");
        vi.stubEnv("QUEUE_JOB_RETENTION_COUNT", "12");

        expect(getEnvVar("MYSQL_URL")).toBe("mysql://user:pass@localhost:3306/app");
        expect(getEnvVar("QUEUE_JOB_RETENTION_COUNT")).toBe("12");
        expect(resolvePositiveIntegerEnv("QUEUE_JOB_RETENTION_COUNT", 50)).toBe(12);
        expect(resolvePositiveIntegerEnv("MISSING_POSITIVE_INTEGER", 50)).toBe(50);

        vi.stubGlobal("process", {
            env: {
                MODE: "process-mode",
                PROCESS_EMPTY: "",
                PROCESS_ONLY: "process-value",
                PROCESS_UNDEFINED: undefined,
            },
            pid: 4241,
        });
        vi.stubGlobal("Deno", {
            env: {
                get: (key: string) =>
                    key === "PROCESS_MISSING_DENO_PRESENT" || key === "PROCESS_UNDEFINED"
                        ? "deno-fallback-value"
                        : undefined,
            },
            pid: 4242,
        });

        expect(getEnvVar("MODE")).toBe("process-mode");
        expect(getEnvVar("PROCESS_EMPTY")).toBe("");
        expect(getEnvVar("PROCESS_ONLY")).toBe("process-value");
        expect(getEnvVar("PROCESS_MISSING_DENO_PRESENT")).toBe("deno-fallback-value");
        expect(getEnvVar("PROCESS_UNDEFINED")).toBe("deno-fallback-value");
        expect(getProcessId()).toBe(4241);

        vi.stubGlobal("process", {
            env: {},
            pid: undefined,
        });
        vi.stubGlobal("Deno", {
            env: {
                get: (key: string) => (key === "DENO_ONLY" ? "deno-value" : undefined),
            },
            pid: 4242,
        });

        expect(getEnvVar("DENO_ONLY")).toBe("deno-value");
        expect(getProcessId()).toBe(4242);

        vi.stubGlobal("Deno", undefined);
        expect(getEnvVar("MISSING_EVERYWHERE")).toBeUndefined();
    });

    it("throws named runtime configuration errors for invalid positive integers", () => {
        vi.stubEnv("QUEUE_JOB_RETENTION_COUNT", "0");

        expect(() => resolvePositiveIntegerEnv("QUEUE_JOB_RETENTION_COUNT", 50)).toThrow(
            RuntimeConfigurationError
        );
        expect(() => resolvePositiveIntegerEnv("QUEUE_JOB_RETENTION_COUNT", 50)).toThrow(
            "QUEUE_JOB_RETENTION_COUNT 必须是正整数。"
        );
    });

    it("resolves process identity helpers from process and pm2 env", () => {
        vi.stubEnv("pm2_instance_name", "queue-worker");
        vi.stubEnv("pm2_instance_id", "2");
        vi.stubGlobal("process", {
            env: process.env,
            pid: 12345,
        });

        expect(getProcessId()).toBe(12345);
        expect(getPm2InstanceName()).toBe("queue-worker");
        expect(getPm2InstanceId()).toBe("2");

        delete process.env.pm2_instance_id;
        vi.stubEnv("NODE_APP_INSTANCE", "3");

        expect(getPm2InstanceId()).toBe("3");
    });

    it("falls back to a generated process id when process and Deno ids are missing", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.12345);
        vi.stubGlobal("process", {});
        vi.stubGlobal("Deno", {});

        expect(getProcessId()).toBe(12345);
    });
});

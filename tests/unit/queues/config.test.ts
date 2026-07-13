import { beforeEach, describe, expect, it, vi } from "vitest";

import queueConfig from "@/queues/config.json" with { type: "json" };

const { redisConstructorMock } = vi.hoisted(() => ({
    redisConstructorMock: vi.fn(),
}));

vi.mock("ioredis", () => {
    class RedisMock {
        constructor(url: string, options: unknown) {
            redisConstructorMock(url, options);
        }
    }

    return {
        default: RedisMock,
    };
});

describe("queue config", () => {
    beforeEach(() => {
        vi.resetModules();
        redisConstructorMock.mockReset();
        delete process.env.REDIS_KEY_PREFIX;
        delete process.env.NODE_ENV;
        delete process.env.QUEUE_EXECUTION_RECORD_TTL_SECONDS;
        delete process.env.QUEUE_JOB_RETENTION_SECONDS;
        delete process.env.QUEUE_JOB_RETENTION_COUNT;
        process.env.REDIS_URL = "redis://127.0.0.1:6379/0";
    });

    it("resolves bullmq prefix from redis prefix", async () => {
        process.env.REDIS_KEY_PREFIX = "project-a";

        const { getBullMqPrefix } =
            await import("@shanjing/astro-full-stack-starter/queue/adapters/bullmq");

        expect(getBullMqPrefix()).toBe("project-a:bull");
    });

    it("resolves queue retention defaults and environment overrides", async () => {
        const {
            getQueueExecutionRecordTtlSeconds,
            getQueueJobRetentionCount,
            getQueueJobRetentionSeconds,
        } = await import("@shanjing/astro-full-stack-starter/queue/config");

        expect(getQueueExecutionRecordTtlSeconds()).toBe(604800);
        expect(getQueueJobRetentionSeconds()).toBe(604800);
        expect(getQueueJobRetentionCount()).toBe(50);

        process.env.QUEUE_EXECUTION_RECORD_TTL_SECONDS = "180";
        process.env.QUEUE_JOB_RETENTION_SECONDS = "240";
        process.env.QUEUE_JOB_RETENTION_COUNT = "5";

        expect(getQueueExecutionRecordTtlSeconds()).toBe(180);
        expect(getQueueJobRetentionSeconds()).toBe(240);
        expect(getQueueJobRetentionCount()).toBe(5);
    });

    it("reads scheduler runtime config from queue config", async () => {
        const { getQueueSchedulerRuntimeConfig } =
            await import("@shanjing/astro-full-stack-starter/queue/config");
        const {
            getActiveQueueNames,
            getQueueConfigByQueueName,
            getQueueSchedulerConfig,
            queueConfigs,
        } = await import("@/queues/config");

        expect(getQueueSchedulerRuntimeConfig().heartbeatTtlMs).toBe(120000);
        expect(getQueueSchedulerConfig()).toEqual(
            expect.objectContaining({
                description: "Cron 计划任务调度器",
                tickIntervalMs: 30000,
            })
        );
        expect(getActiveQueueNames()).toEqual(["critical", "default", "low"]);
        expect(queueConfigs).toHaveLength(3);
        expect(queueConfig.pm2.script).toBe("scripts/start-queue-worker.mjs");
        expect(queueConfig.queues.critical.concurrency).toBe(2);
        expect(queueConfig.queues.critical.instances).toBe(1);
        expect(queueConfig.queues.default.instances).toBe(1);
        expect(queueConfig.queues.low.instances).toBe(1);
        expect(getQueueConfigByQueueName("low")).toEqual(
            expect.objectContaining({
                name: "low",
            })
        );
        expect(getQueueConfigByQueueName("unknown-queue")).toBeUndefined();
    });

    it("creates producer and worker redis connections with expected options", async () => {
        const { createQueueRedisConnection } =
            await import("@shanjing/astro-full-stack-starter/queue/adapters/bullmq");

        createQueueRedisConnection();
        createQueueRedisConnection("worker");

        expect(redisConstructorMock).toHaveBeenCalledWith(
            "redis://127.0.0.1:6379/0",
            expect.objectContaining({
                connectionName: expect.stringMatching(/^producer-\d+$/),
            })
        );
        expect(redisConstructorMock).toHaveBeenCalledWith(
            "redis://127.0.0.1:6379/0",
            expect.objectContaining({
                connectionName: expect.stringMatching(/^worker-\d+$/),
                maxRetriesPerRequest: null,
            })
        );
    });

    it("requires redis key prefix in production queue runtime", async () => {
        process.env.NODE_ENV = "production";

        const { createQueueRedisConnection } =
            await import("@shanjing/astro-full-stack-starter/queue/adapters/bullmq");

        expect(() => createQueueRedisConnection()).toThrow(
            "Queue Redis 在 production 环境需要配置 REDIS_KEY_PREFIX"
        );

        process.env.REDIS_KEY_PREFIX = "project-a";

        expect(() => createQueueRedisConnection()).not.toThrow();
    });

    it("rejects invalid queue retention environment values", async () => {
        process.env.QUEUE_JOB_RETENTION_COUNT = "-1";

        const { QueueConfigurationError, getQueueJobRetentionCount } =
            await import("@shanjing/astro-full-stack-starter/queue/config");

        expect(() => getQueueJobRetentionCount()).toThrow(
            "QUEUE_JOB_RETENTION_COUNT 必须是正整数。"
        );
        const error = new QueueConfigurationError("bad queue config");

        expect(error.name).toBe("QueueConfigurationError");
        expect(error.message).toBe("bad queue config");
    });
});

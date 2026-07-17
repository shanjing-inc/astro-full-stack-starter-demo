import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { queueAddMock, queueConstructorMock, redisConstructorMock, redisMultiExecMock } = vi.hoisted(
    () => ({
        queueAddMock: vi.fn(),
        queueConstructorMock: vi.fn(),
        redisConstructorMock: vi.fn(),
        redisMultiExecMock: vi.fn(async () => []),
    })
);

vi.mock("bullmq", () => {
    class QueueMock {
        constructor(name: string, options: unknown) {
            queueConstructorMock(name, options);
        }

        add = queueAddMock;
    }

    return {
        Queue: QueueMock,
    };
});

vi.mock("ioredis", () => {
    class RedisMock {
        constructor(url: string, options: unknown) {
            redisConstructorMock(url, options);
        }

        async expire() {
            return 1;
        }

        async get() {
            return null;
        }

        async hset() {
            return 1;
        }

        async incr() {
            return 1;
        }

        multi() {
            const transaction = {
                exec: redisMultiExecMock,
                expire: () => transaction,
                hset: () => transaction,
                sadd: () => transaction,
                set: () => transaction,
                zadd: () => transaction,
                zrem: () => transaction,
            };

            return transaction;
        }

        async sadd() {
            return 1;
        }

        async set() {
            return "OK";
        }

        async zadd() {
            return 1;
        }

        async zrem() {
            return 1;
        }
    }

    return {
        default: RedisMock,
    };
});

const queueCacheKey = "__queueCache__";

describe("job producer", () => {
    beforeEach(() => {
        vi.resetModules();
        queueAddMock.mockReset();
        queueConstructorMock.mockReset();
        redisConstructorMock.mockReset();
        redisMultiExecMock.mockReset();
        redisMultiExecMock.mockResolvedValue([]);
        delete (globalThis as Record<string, unknown>)[queueCacheKey];
        delete (globalThis as Record<string, unknown>).__executionRecordsRedis__;
        delete process.env.name;
        delete process.env.pm2_instance_name;
        delete process.env.REDIS_URL;
        delete process.env.REDIS_KEY_PREFIX;
        delete process.env.QUEUE_JOB_RETENTION_SECONDS;
        delete process.env.QUEUE_JOB_RETENTION_COUNT;
    });

    it("dispatches validated jobs and reuses the queue cache", async () => {
        const { defineJob } = await import("@shanjing/astro-full-stack-starter/queue/core");
        const { dispatchJob } =
            await import("@shanjing/astro-full-stack-starter/queue/adapters/bullmq");

        process.env.QUEUE_JOB_RETENTION_COUNT = "10";
        process.env.QUEUE_JOB_RETENTION_SECONDS = "3600";
        process.env.name = "自定义环境构建";
        process.env.REDIS_KEY_PREFIX = "project-a";
        process.env.REDIS_URL = "redis://127.0.0.1:6379/0";
        queueAddMock.mockResolvedValue({
            id: "job-1",
            getState: async () => "completed",
            queueName: "default",
            toJSON: () => ({
                attemptsMade: 0,
                data: {
                    id: 1,
                },
                id: "job-1",
                name: "demo-job",
                opts: {
                    attempts: 3,
                    removeOnComplete: {
                        age: 3600,
                        count: 10,
                    },
                    removeOnFail: {
                        age: 3600,
                        count: 10,
                    },
                },
                finishedOn: 456,
                processedOn: 234,
                returnvalue: {
                    ok: true,
                },
                stacktrace: [],
                timestamp: 123,
            }),
        });

        const definition = defineJob({
            queueName: "default",
            defaultJobOptions: {
                attempts: 3,
            },
            name: "demo-job",
            params: z.object({
                id: z.number().int(),
            }),
        });

        const firstResult = await dispatchJob({
            definition,
            jobData: {
                id: 1,
            },
        });
        const secondResult = await dispatchJob({
            definition,
            jobData: {
                id: 2,
            },
        });

        expect(firstResult).toEqual({
            jobId: "job-1",
            ok: true,
        });
        expect(secondResult).toEqual({
            jobId: "job-1",
            ok: true,
        });
        expect(queueConstructorMock).toHaveBeenCalledTimes(1);
        expect(queueConstructorMock).toHaveBeenCalledWith(
            "default",
            expect.objectContaining({
                prefix: "project-a:bull",
            })
        );
        expect(redisConstructorMock).toHaveBeenCalledWith(
            "redis://127.0.0.1:6379/0",
            expect.objectContaining({
                connectionName: expect.stringMatching(/^producer-\d+$/),
            })
        );
        expect(queueAddMock).toHaveBeenNthCalledWith(
            1,
            "demo-job",
            {
                id: 1,
            },
            {
                attempts: 3,
                removeOnComplete: {
                    age: 3600,
                    count: 10,
                },
                removeOnFail: {
                    age: 3600,
                    count: 10,
                },
            }
        );
    });

    it("returns a validation error when the payload does not match the schema", async () => {
        const { defineJob } = await import("@shanjing/astro-full-stack-starter/queue/core");
        const { dispatchJob } =
            await import("@shanjing/astro-full-stack-starter/queue/adapters/bullmq");

        process.env.REDIS_URL = "redis://127.0.0.1:6379/0";

        const result = await dispatchJob({
            definition: defineJob({
                queueName: "default",
                name: "demo-job",
                params: z.object({
                    id: z.number().int(),
                }),
            }),
            jobData: {
                id: "bad-id",
            } as never,
        });

        expect(result).toEqual({
            message: "任务数据校验失败。",
            ok: false,
            reason: "validation_error",
        });
        expect(queueConstructorMock).not.toHaveBeenCalled();
        expect(queueAddMock).not.toHaveBeenCalled();
    });

    it("returns a configuration error when redis is missing", async () => {
        const { defineJob } = await import("@shanjing/astro-full-stack-starter/queue/core");
        const { dispatchJob } =
            await import("@shanjing/astro-full-stack-starter/queue/adapters/bullmq");

        const result = await dispatchJob({
            definition: defineJob({
                queueName: "default",
                name: "demo-job",
                params: z.object({
                    id: z.number().int(),
                }),
            }),
            jobData: {
                id: 1,
            },
        });

        expect(result).toEqual({
            message: "未配置 REDIS_URL。",
            ok: false,
            reason: "configuration_error",
        });
        expect(queueConstructorMock).not.toHaveBeenCalled();
    });

    it("maps queue add failures to connection errors", async () => {
        const { defineJob } = await import("@shanjing/astro-full-stack-starter/queue/core");
        const { dispatchJob } =
            await import("@shanjing/astro-full-stack-starter/queue/adapters/bullmq");

        process.env.REDIS_URL = "redis://127.0.0.1:6379/0";
        queueAddMock.mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:6379"));

        const result = await dispatchJob({
            definition: defineJob({
                queueName: "default",
                name: "demo-job",
                params: z.object({
                    id: z.number().int(),
                }),
            }),
            jobData: {
                id: 1,
            },
        });

        expect(result).toEqual({
            message: "connect ECONNREFUSED 127.0.0.1:6379",
            ok: false,
            reason: "connection_error",
        });
    });

    it("maps unknown queue add failures and applies dedupe job ids", async () => {
        const { defineJob } = await import("@shanjing/astro-full-stack-starter/queue/core");
        const { dispatchJob } =
            await import("@shanjing/astro-full-stack-starter/queue/adapters/bullmq");

        process.env.REDIS_URL = "redis://127.0.0.1:6379/0";
        queueAddMock
            .mockRejectedValueOnce("boom")
            .mockRejectedValueOnce(new Error("boom"))
            .mockResolvedValueOnce({
                getState: async () => "waiting",
                id: "custom-id",
                queueName: "jobs-custom",
                toJSON: () => ({
                    data: {
                        id: 2,
                    },
                    id: "custom-id",
                    name: "demo-job",
                }),
            });

        const definition = defineJob({
            dedupeKey: (data: { id: number }) => `demo:${data.id}`,
            name: "demo-job",
            params: z.object({
                id: z.number().int(),
            }),
            queueName: "default",
        });

        await expect(
            dispatchJob({
                definition,
                jobData: {
                    id: 1,
                },
            })
        ).resolves.toEqual({
            message: "任务派发失败。",
            ok: false,
            reason: "unknown",
        });
        await expect(
            dispatchJob({
                definition,
                jobData: {
                    id: 1,
                },
            })
        ).resolves.toEqual({
            message: "boom",
            ok: false,
            reason: "unknown",
        });
        await expect(
            dispatchJob({
                definition,
                jobData: {
                    id: 2,
                },
                queueName: "jobs-custom",
            })
        ).resolves.toEqual({
            jobId: "custom-id",
            ok: true,
        });
        expect(queueAddMock).toHaveBeenLastCalledWith(
            "demo-job",
            {
                id: 2,
            },
            expect.objectContaining({
                jobId: "demo:2",
            })
        );
    });

    it("syncs active and failed job states after dispatch", async () => {
        const { defineJob } = await import("@shanjing/astro-full-stack-starter/queue/core");
        const { dispatchJob } =
            await import("@shanjing/astro-full-stack-starter/queue/adapters/bullmq");

        process.env.REDIS_URL = "redis://127.0.0.1:6379/0";
        queueAddMock
            .mockResolvedValueOnce({
                getState: async () => "active",
                id: "active-job",
                queueName: "default",
                toJSON: () => ({
                    attemptsMade: 1,
                    data: {
                        id: 1,
                    },
                    id: "active-job",
                    name: "demo-job",
                    opts: {},
                    processedOn: null,
                    timestamp: 123,
                }),
            })
            .mockResolvedValueOnce({
                getState: async () => "failed",
                id: "failed-job",
                queueName: "default",
                toJSON: () => ({
                    attemptsMade: 2,
                    data: {
                        id: 2,
                    },
                    failedReason: "boom",
                    id: "failed-job",
                    name: "demo-job",
                    opts: {},
                    stacktrace: ["trace"],
                    timestamp: 456,
                }),
            });
        const definition = defineJob({
            queueName: "default",
            name: "demo-job",
            params: z.object({
                id: z.number().int(),
            }),
        });

        await expect(
            dispatchJob({
                definition,
                dispatchMeta: {
                    dispatchedAt: "2026-05-07T00:00:00.000Z",
                    source: "manual",
                },
                jobData: {
                    id: 1,
                },
            })
        ).resolves.toEqual({
            jobId: "active-job",
            ok: true,
        });
        await expect(
            dispatchJob({
                definition,
                jobData: {
                    id: 2,
                },
            })
        ).resolves.toEqual({
            jobId: "failed-job",
            ok: true,
        });

        expect(queueAddMock).toHaveBeenCalledTimes(2);
    });

    it("keeps dispatch successful when execution record sync fails", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { defineJob } = await import("@shanjing/astro-full-stack-starter/queue/core");
        const { dispatchJob } =
            await import("@shanjing/astro-full-stack-starter/queue/adapters/bullmq");

        process.env.REDIS_URL = "redis://127.0.0.1:6379/0";
        redisMultiExecMock.mockRejectedValue(new Error("record write failed"));
        queueAddMock.mockResolvedValue({
            getState: async () => "completed",
            toJSON: () => ({
                data: {
                    id: 1,
                },
                opts: {},
                timestamp: 123,
            }),
        });

        await expect(
            dispatchJob({
                definition: defineJob({
                    name: "demo-job",
                    params: z.object({
                        id: z.number().int(),
                    }),
                    queueName: "default",
                }),
                jobData: {
                    id: 1,
                },
            })
        ).resolves.toEqual({
            jobId: null,
            ok: true,
        });
        expect(warnSpy).toHaveBeenCalledWith(
            "[queue:default] Failed to create waiting execution record: record write failed"
        );
    });
});

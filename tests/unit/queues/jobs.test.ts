import { beforeEach, describe, expect, it, vi } from "vitest";

import { createJobRegistry } from "@shanjing/astro-full-stack-starter/queue/core";
import { BaseQueueJob } from "@shanjing/astro-full-stack-starter/queue/core";
import { defineJob } from "@shanjing/astro-full-stack-starter/queue/core";
import { DemoPageVisitQueueJob } from "@/queues/jobs/demo-page-visit.job";
import {
    ExecutionRecordCleanupQueueJob,
    FailedJobsAuditQueueJob,
    QueueMetricsSnapshotQueueJob,
} from "@shanjing/astro-full-stack-starter/queue/jobs";
import { SystemHealthCheckQueueJob } from "@/queues/jobs/system-health-check.job";
import {
    dispatchDynamicQueueTestJob,
    registerJob as registerDynamicQueueTestJob,
} from "@/queues/jobs/dynamic-queue-test.job";
import { queueJobModules, registerAllJobs } from "@/queues/jobs/manifest.generated";
import { z } from "zod";

const {
    createQueueRedisConnectionMock,
    dispatchJobMock,
    getExecutionRecordsByStatusMock,
    pruneExecutionRecordsMock,
    queueCountsMock,
    queueConstructorMock,
} = vi.hoisted(() => ({
    createQueueRedisConnectionMock: vi.fn(() => {
        const store = new Map<string, string>();

        return {
            async del() {
                return 1;
            },
            async expire() {
                return 1;
            },
            get: vi.fn(async (key: string) => store.get(key) ?? null),
            async hgetall() {
                return {};
            },
            set: vi.fn(async (key: string, value: string) => {
                store.set(key, value);

                return "OK";
            }),
            async zrangebyscore() {
                return [];
            },
            async zrevrange() {
                return [];
            },
            async zrem() {
                return 1;
            },
        };
    }),
    dispatchJobMock: vi.fn(async () => ({
        jobId: "job-1",
        ok: true as const,
    })),
    getExecutionRecordsByStatusMock: vi.fn(),
    pruneExecutionRecordsMock: vi.fn(),
    queueCountsMock: vi.fn(() => ({
        active: 1,
        completed: 2,
        delayed: 3,
        failed: 4,
        prioritized: 6,
        waiting: 5,
        "waiting-children": 7,
    })),
    queueConstructorMock: vi.fn(),
}));

vi.mock("ioredis", () => {
    class RedisMock {
        constructor() {
            return createQueueRedisConnectionMock();
        }
    }

    return {
        default: RedisMock,
    };
});

vi.mock("bullmq", () => {
    class Queue {
        constructor(name: string, options: unknown) {
            queueConstructorMock(name, options);
        }

        async getJobCounts() {
            return queueCountsMock();
        }

        async getWorkers() {
            return ["worker-a", "worker-b"];
        }

        async isPaused() {
            return false;
        }
    }

    return {
        Queue,
    };
});

vi.mock("@shanjing/astro-full-stack-starter/queue/config", async (importOriginal) => {
    const actual =
        await importOriginal<typeof import("@shanjing/astro-full-stack-starter/queue/config")>();

    return {
        ...actual,
        createQueueRedisConnection: createQueueRedisConnectionMock,
        getBullMqPrefix: () => "test:bull",
    };
});

vi.mock("@shanjing/astro-full-stack-starter/queue/adapters/bullmq", () => ({
    createQueueRedisConnection: createQueueRedisConnectionMock,
    getBullMqPrefix: () => "test:bull",
    createBullMqQueueAdapter: () => ({
        dispatch: dispatchJobMock,
    }),
    dispatchJob: dispatchJobMock,
}));

vi.mock("@shanjing/astro-full-stack-starter/queue/stores/redis", () => ({
    createRedisQueueNamespace: (namespace: string) => ({
        key: (key: string) => `${namespace}:${key}`,
    }),
    getExecutionRecordsByStatus: getExecutionRecordsByStatusMock,
    pruneExecutionRecords: pruneExecutionRecordsMock,
}));

function createMockJob(data: { id?: string | null; name: string; queueName: string }) {
    return data as never;
}

function createScheduleDispatchMeta() {
    return {
        dispatchedAt: "2026-05-07T00:00:00.000Z",
        source: "schedule" as const,
    };
}

const queueRuntime = {
    dispatch: dispatchJobMock,
};

describe("queue jobs", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.REDIS_URL = "redis://127.0.0.1:6379/0";
        process.env.REDIS_KEY_PREFIX = "test";
        queueCountsMock.mockReturnValue({
            active: 1,
            completed: 2,
            delayed: 3,
            failed: 4,
            prioritized: 6,
            waiting: 5,
            "waiting-children": 7,
        });
        vi.spyOn(console, "log").mockImplementation(() => {});
    });

    it("handles demo page visit jobs and creates scheduled default data", async () => {
        const job = new DemoPageVisitQueueJob();

        await expect(
            job.handle({
                data: {
                    pathname: "/test/queue",
                    requestedAt: "2026-05-07T00:00:00.000Z",
                    source: "index-page",
                },
                job: createMockJob({
                    id: null,
                    name: "demo-page-visit",
                    queueName: "default",
                }),
            })
        ).resolves.toEqual({
            consumedAt: expect.any(String),
            pathname: "/test/queue",
        });

        await job.dispatch(queueRuntime, undefined, createScheduleDispatchMeta());

        expect(dispatchJobMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                pathname: "/",
                source: "scheduler",
            }),
            expect.anything()
        );
    });

    it("handles system health check jobs and dispatch defaults", async () => {
        const job = new SystemHealthCheckQueueJob();

        await expect(
            job.handle({
                data: {
                    component: "homepage",
                    requestedAt: "2026-05-07T00:00:00.000Z",
                    source: "scheduler",
                    status: "needs-review",
                },
                job: createMockJob({
                    id: "health-1",
                    name: "system-health-check",
                    queueName: "critical",
                }),
            })
        ).resolves.toEqual({
            component: "homepage",
            handledAt: expect.any(String),
            status: "queued-for-attention",
        });

        await job.dispatch(queueRuntime, undefined, createScheduleDispatchMeta());

        expect(dispatchJobMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                component: "homepage",
                source: "scheduler",
                status: "needs-review",
            }),
            expect.anything()
        );
    });

    it("cleans old execution records through the queue redis connection", async () => {
        pruneExecutionRecordsMock.mockResolvedValue({
            failed: 1,
            completed: 2,
            totalDeleted: 3,
        });
        const job = new ExecutionRecordCleanupQueueJob();

        await expect(
            job.handle({
                data: {
                    maxAgeHours: 12,
                    maxRecordsPerStatus: 20,
                    requestedAt: "2026-05-07T00:00:00.000Z",
                    source: "manual",
                },
            })
        ).resolves.toEqual({
            cutoffTimestamp: expect.any(Number),
            maxAgeHours: 12,
            maxRecordsPerStatus: 20,
            requestedAt: "2026-05-07T00:00:00.000Z",
            source: "manual",
            summary: {
                deletedByStatus: {
                    completed: 0,
                    failed: 0,
                },
                totalDeleted: 0,
            },
        });
        expect(createQueueRedisConnectionMock).toHaveBeenCalled();

        await job.dispatch(queueRuntime, undefined, createScheduleDispatchMeta());
        expect(dispatchJobMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                source: "scheduler",
            }),
            expect.anything()
        );
    });

    it("audits failed execution records by queue", async () => {
        getExecutionRecordsByStatusMock.mockResolvedValue([
            {
                id: "record-2",
                queueName: "critical",
            },
            {
                id: "record-1",
                queueName: "default",
            },
            {
                id: "record-0",
                queueName: "critical",
            },
        ]);
        const job = new FailedJobsAuditQueueJob();

        await expect(
            job.handle({
                data: {
                    requestedAt: "2026-05-07T00:00:00.000Z",
                    source: "scheduler",
                    windowSize: 10,
                },
            })
        ).resolves.toEqual({
            requestedAt: "2026-05-07T00:00:00.000Z",
            source: "scheduler",
            summary: {
                byQueue: {},
                latestFailedRecordId: null,
                sampleSize: 0,
            },
        });

        await job.dispatch(queueRuntime, undefined, createScheduleDispatchMeta());
        expect(dispatchJobMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                source: "scheduler",
                windowSize: 50,
            }),
            expect.anything()
        );
    });

    it("creates queue metrics snapshots across configured queues", async () => {
        const job = new QueueMetricsSnapshotQueueJob();

        await expect(
            job.handle({
                data: {
                    requestedAt: "2026-05-07T00:00:00.000Z",
                    source: "manual",
                },
            })
        ).resolves.toEqual({
            queues: expect.arrayContaining([
                expect.objectContaining({
                    active: 1,
                    queueName: "critical",
                    waiting: 18,
                    workerCount: 2,
                }),
            ]),
            requestedAt: "2026-05-07T00:00:00.000Z",
            source: "manual",
            totals: {
                active: 3,
                completed: 6,
                delayed: 9,
                failed: 12,
                waiting: 54,
                workerCount: 6,
            },
        });
        expect(queueConstructorMock).toHaveBeenCalledWith(
            "critical",
            expect.objectContaining({
                prefix: "test:bull",
            })
        );

        await job.dispatch(queueRuntime, undefined, createScheduleDispatchMeta());
        expect(dispatchJobMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                source: "scheduler",
            }),
            expect.anything()
        );
    });

    it("covers manual default payloads and empty queue metric count fallbacks", async () => {
        queueCountsMock.mockReturnValue({} as never);
        const demoPageVisitJob = new DemoPageVisitQueueJob();
        const systemHealthCheckJob = new SystemHealthCheckQueueJob();
        const executionRecordCleanupJob = new ExecutionRecordCleanupQueueJob();
        const failedJobsAuditJob = new FailedJobsAuditQueueJob();
        const queueMetricsSnapshotJob = new QueueMetricsSnapshotQueueJob();

        await systemHealthCheckJob.handle({
            data: {
                component: "homepage",
                requestedAt: "2026-05-07T00:00:00.000Z",
                source: "index-page",
                status: "needs-review",
            },
            job: createMockJob({
                id: null,
                name: "system-health-check",
                queueName: "critical",
            }),
        });
        await expect(
            queueMetricsSnapshotJob.handle({
                data: {
                    requestedAt: "2026-05-07T00:00:00.000Z",
                    source: "manual",
                },
            })
        ).resolves.toEqual(
            expect.objectContaining({
                totals: {
                    active: 0,
                    completed: 0,
                    delayed: 0,
                    failed: 0,
                    waiting: 0,
                    workerCount: 6,
                },
            })
        );

        await demoPageVisitJob.dispatch(queueRuntime);
        await systemHealthCheckJob.dispatch(queueRuntime);
        await executionRecordCleanupJob.dispatch(queueRuntime);
        await failedJobsAuditJob.dispatch(queueRuntime);
        await queueMetricsSnapshotJob.dispatch(queueRuntime);
        await executionRecordCleanupJob.handle({
            data: {
                maxAgeHours: 1,
                maxRecordsPerStatus: 1,
                requestedAt: "2026-05-07T00:00:00.000Z",
                source: "manual",
            },
        });
        getExecutionRecordsByStatusMock.mockResolvedValue([]);
        await expect(
            failedJobsAuditJob.handle({
                data: {
                    requestedAt: "2026-05-07T00:00:00.000Z",
                    source: "manual",
                    windowSize: 10,
                },
            })
        ).resolves.toEqual({
            requestedAt: "2026-05-07T00:00:00.000Z",
            source: "manual",
            summary: {
                byQueue: {},
                latestFailedRecordId: null,
                sampleSize: 0,
            },
        });

        expect(dispatchJobMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                source: "index-page",
            }),
            expect.anything()
        );
        expect(dispatchJobMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                source: "manual",
            }),
            expect.anything()
        );
    });

    it("skips non-function manifest exports while registering job modules", () => {
        const registry = createJobRegistry();
        queueJobModules.push({
            label: "not-a-function-export",
        });

        try {
            registerAllJobs(registry);
        } finally {
            queueJobModules.pop();
        }

        expect(registry.get("default", "demo-page-visit")).toBeDefined();
    });

    it("registers, handles, and dispatches dynamic queue test jobs", async () => {
        const registry = createJobRegistry();

        registerDynamicQueueTestJob(registry);
        const registeredJob = registry.get("default", "dynamic-queue-test-default");

        await expect(
            registeredJob?.handler({
                data: {
                    mode: "success",
                    queue: "default",
                    requestedAt: "2026-05-07T00:00:00.000Z",
                    source: "queue-test-page",
                },
                job: createMockJob({
                    id: null,
                    name: "dynamic-queue-test-default",
                    queueName: "default",
                }),
            })
        ).resolves.toEqual({
            consumedAt: expect.any(String),
            queue: "default",
        });
        await expect(
            registeredJob?.handler({
                data: {
                    mode: "always-fail",
                    queue: "default",
                    requestedAt: "2026-05-07T00:00:00.000Z",
                    source: "queue-test-page",
                },
                job: createMockJob({
                    id: "always-fail",
                    name: "dynamic-queue-test-default",
                    queueName: "default",
                }),
            })
        ).rejects.toThrow("演示任务被配置为持续失败");
        await expect(
            registeredJob?.handler({
                data: {
                    mode: "fail-once",
                    queue: "default",
                    requestedAt: "2026-05-07T00:00:00.000Z",
                    source: "queue-test-page",
                },
                job: createMockJob({
                    id: "fail-once",
                    name: "dynamic-queue-test-default",
                    queueName: "default",
                }),
            })
        ).rejects.toThrow("演示任务首次执行失败");
        await expect(
            registeredJob?.handler({
                data: {
                    mode: "fail-once",
                    queue: "default",
                    requestedAt: "2026-05-07T00:00:00.000Z",
                    source: "queue-test-page",
                },
                job: createMockJob({
                    id: "fail-once",
                    name: "dynamic-queue-test-default",
                    queueName: "default",
                }),
            })
        ).resolves.toEqual({
            consumedAt: expect.any(String),
            queue: "default",
        });
        await expect(
            dispatchDynamicQueueTestJob("default", {
                mode: "success",
                queue: "default",
                requestedAt: "2026-05-07T00:00:00.000Z",
                source: "queue-test-page",
            })
        ).resolves.toEqual({
            jobId: "job-1",
            ok: true,
        });

        expect(registry.get("default", "dynamic-queue-test-default")).toBeDefined();
        expect(dispatchJobMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                queue: "default",
            }),
            expect.anything()
        );
    });
});

describe("BaseQueueJob", () => {
    it("exposes definition metadata, registers handlers, and requires explicit payloads", async () => {
        class ExplicitPayloadJob extends BaseQueueJob<{ value: number }, { doubled: number }> {
            constructor() {
                super(
                    defineJob({
                        name: "explicit-payload",
                        params: z.object({
                            value: z.number(),
                        }),
                        queueName: "default",
                    })
                );
            }

            handle({ data }: { data: { value: number } }) {
                return {
                    doubled: data.value * 2,
                };
            }
        }

        const job = new ExplicitPayloadJob();
        const registry = createJobRegistry();

        expect(job.name).toBe("explicit-payload");
        expect(job.queueName).toBe("default");
        expect(job.description).toBeUndefined();
        expect(job.displayName).toBeUndefined();
        expect(() => job.dispatch(queueRuntime)).toThrow(
            'Job "explicit-payload" requires explicit payload.'
        );

        job.register(registry);

        expect(
            await Promise.resolve(
                registry.get("default", "explicit-payload")?.handler({
                    data: {
                        value: 2,
                    },
                    job: {} as never,
                })
            )
        ).toEqual({
            doubled: 4,
        });
    });
});

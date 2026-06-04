import { describe, expect, it, vi } from "vitest";

import { defineJob } from "@shanjing/astro-full-stack-starter/queue/core";
import { type JobHandlerContext } from "@shanjing/astro-full-stack-starter/queue/core";
import { BaseQueueJob } from "@shanjing/astro-full-stack-starter/queue/core";
import { createScheduleRegistry } from "@shanjing/astro-full-stack-starter/queue/core";
import {
    createQueueKernel,
    getRegisteredSchedules,
    scheduleCall,
    scheduleJob,
} from "@/queues/kernel";
import { z } from "zod";

describe("queue kernel", () => {
    const queueRuntime = {
        dispatch: vi.fn(async () => ({
            jobId: "job-1",
            ok: true as const,
        })),
    };

    it("registers all built-in schedules in one place", () => {
        const schedules = getRegisteredSchedules();

        expect(schedules.map((schedule) => schedule.name)).toEqual([
            "queue-metrics-snapshot",
            "failed-jobs-audit",
            "execution-record-cleanup",
            "homepage-system-health-check",
            "failed-jobs-audit-morning",
            "morning-maintenance-batch",
        ]);
        expect(schedules.map((schedule) => schedule.cron)).toEqual([
            "*/10 * * * *",
            "0 * * * *",
            "30 4 * * *",
            "*/15 * * * *",
            "0 8 * * *",
            "0 8 * * *",
        ]);
    });

    it("creates a schedule registry with dispatchable entries", () => {
        const registry = createQueueKernel();
        const schedule = registry.getByName("homepage-system-health-check");

        expect(schedule).toEqual(
            expect.objectContaining({
                enabledByDefault: true,
                jobName: "system-health-check",
                queueName: "critical",
                timezone: "Asia/Shanghai",
            })
        );
        expect(typeof schedule?.dispatch).toBe("function");
        expect(typeof schedule?.buildPayload).toBe("function");
    });

    it("supports explicit payload or buildPayload when defining schedules", async () => {
        const registry = createScheduleRegistry();
        class DemoQueueJob extends BaseQueueJob<{ mode: "static" | "dynamic" }, { ok: true }> {
            constructor() {
                super(
                    defineJob({
                        queueName: "default",
                        name: "demo-job",
                        params: z.object({
                            mode: z.enum(["static", "dynamic"]),
                        }),
                    })
                );
            }

            async handle(_context: JobHandlerContext<{ mode: "static" | "dynamic" }>) {
                return {
                    ok: true as const,
                };
            }
        }

        const demoQueueJob = new DemoQueueJob();
        scheduleJob(registry, demoQueueJob, "0 8 * * *", {
            name: "static-demo",
            payload: {
                mode: "static",
            },
            runtime: queueRuntime,
        });
        scheduleJob(registry, demoQueueJob, "5 8 * * *", {
            buildPayload: () => ({
                mode: "dynamic" as const,
            }),
            name: "dynamic-demo",
            runtime: queueRuntime,
        });

        const staticSchedule = registry.getByName("static-demo");
        const dynamicSchedule = registry.getByName("dynamic-demo");

        await expect(
            Promise.resolve(
                staticSchedule?.buildPayload({
                    now: new Date("2026-04-23T00:00:00.000Z"),
                    runKey: "run-1",
                    scheduleName: "static-demo",
                    scheduledFor: new Date("2026-04-23T00:00:00.000Z"),
                    timezone: "Asia/Shanghai",
                })
            )
        ).resolves.toEqual({
            mode: "static",
        });
        await expect(
            Promise.resolve(
                dynamicSchedule?.buildPayload({
                    now: new Date("2026-04-23T00:00:00.000Z"),
                    runKey: "run-2",
                    scheduleName: "dynamic-demo",
                    scheduledFor: new Date("2026-04-23T00:00:00.000Z"),
                    timezone: "Asia/Shanghai",
                })
            )
        ).resolves.toEqual({
            mode: "dynamic",
        });

        expect(staticSchedule).toEqual(
            expect.objectContaining({
                jobName: "demo-job",
                queueName: "default",
            })
        );
    });

    it("uses job metadata and undefined payloads as schedule defaults", async () => {
        const registry = createScheduleRegistry();
        class MetadataQueueJob extends BaseQueueJob<undefined, { ok: true }> {
            constructor() {
                super(
                    defineJob({
                        description: "metadata description",
                        displayName: "Metadata Queue Job",
                        queueName: "default",
                        name: "metadata-job",
                        params: z.undefined(),
                    })
                );
            }

            async handle() {
                return {
                    ok: true as const,
                };
            }
        }

        scheduleJob(registry, new MetadataQueueJob(), "15 9 * * *", {
            runtime: queueRuntime,
        });

        const schedule = registry.getByName("metadata-job");

        expect(schedule).toEqual(
            expect.objectContaining({
                description: "metadata description",
                jobName: "metadata-job",
                name: "metadata-job",
                queueName: "default",
            })
        );
        await expect(
            Promise.resolve(
                schedule?.buildPayload({
                    now: new Date("2026-05-07T00:00:00.000Z"),
                    runKey: "run-default",
                    scheduleName: "metadata-job",
                    scheduledFor: new Date("2026-05-07T00:00:00.000Z"),
                    timezone: "Asia/Shanghai",
                })
            )
        ).resolves.toBeUndefined();
    });

    it("delegates scheduled job dispatches to the queue job", async () => {
        const registry = createScheduleRegistry();
        const dispatch = vi.fn(async () => ({
            jobId: "job-1",
            ok: true as const,
        }));

        scheduleJob(
            registry,
            {
                description: "fake job",
                displayName: "Fake Job",
                dispatch,
                name: "fake-job",
                queueName: "default",
            } as never,
            "0 10 * * *",
            {
                runtime: queueRuntime,
            }
        );

        await expect(
            registry.getByName("fake-job")?.dispatch(
                {
                    id: 1,
                },
                {
                    dispatchedAt: "2026-05-07T00:00:00.000Z",
                    source: "schedule",
                }
            )
        ).resolves.toEqual({
            jobId: "job-1",
            ok: true,
        });
        expect(dispatch).toHaveBeenCalledWith(
            queueRuntime,
            {
                id: 1,
            },
            expect.objectContaining({
                source: "schedule",
            })
        );
    });

    it("supports inline callback schedules", async () => {
        const registry = createScheduleRegistry();
        const callback = vi.fn(async () => {});

        scheduleCall(registry, callback, "0 11 1 * *", {
            description: "每月 1 号 11 点执行匿名函数。",
            name: "inline-callback-demo",
        });

        const schedule = registry.getByName("inline-callback-demo");

        expect(schedule).toEqual(
            expect.objectContaining({
                cron: "0 11 1 * *",
                jobName: "__inline_callback__",
                name: "inline-callback-demo",
                queueName: "__inline_callback__",
            })
        );

        const result = await schedule?.dispatch(undefined, {
            dispatchedAt: "2026-04-23T00:00:00.000Z",
            runKey: "run-inline",
            scheduleName: "inline-callback-demo",
            scheduledFor: "2026-05-01T03:00:00.000Z",
            source: "schedule",
        });

        expect(callback).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            jobId: null,
            ok: true,
        });
    });

    it("fills inline callback context defaults from dispatch metadata", async () => {
        const registry = createScheduleRegistry();
        const callback = vi.fn(async () => {});

        scheduleCall(registry, callback, "0 12 * * *", {
            name: "inline-default-context",
        });

        const schedule = registry.getByName("inline-default-context");

        await schedule?.dispatch(undefined, {
            dispatchedAt: "2026-05-07T04:00:00.000Z",
            source: "manual",
        });

        expect(callback).toHaveBeenCalledWith(
            expect.objectContaining({
                runKey: "",
                scheduleName: "inline-default-context",
                scheduledFor: new Date("2026-05-07T04:00:00.000Z"),
                timezone: "Asia/Shanghai",
            })
        );
    });

    it("lets a single scheduleCall dispatch multiple queue jobs", async () => {
        const registry = createScheduleRegistry();
        const firstDispatch = vi.fn(async () => ({
            jobId: "job-1",
            ok: true as const,
        }));
        const secondDispatch = vi.fn(
            async (_payload: { requestedAt: string; source: "scheduler"; windowSize: number }) => ({
                jobId: "job-2",
                ok: true as const,
            })
        );

        scheduleCall(
            registry,
            async () => {
                await firstDispatch();
                await secondDispatch({
                    requestedAt: "2026-04-23T00:00:00.000Z",
                    source: "scheduler",
                    windowSize: 100,
                });
            },
            "0 8 * * *",
            {
                description: "批量派发多个队列任务。",
                name: "multi-dispatch-demo",
            }
        );

        const schedule = registry.getByName("multi-dispatch-demo");

        await schedule?.dispatch(undefined, {
            dispatchedAt: "2026-04-23T00:00:00.000Z",
            runKey: "run-multi",
            scheduleName: "multi-dispatch-demo",
            scheduledFor: "2026-04-23T00:00:00.000Z",
            source: "schedule",
        });

        expect(firstDispatch).toHaveBeenCalledTimes(1);
        expect(secondDispatch).toHaveBeenCalledTimes(1);
    });

    it("dispatches built-in morning maintenance schedules", async () => {
        const registry = createQueueKernel();
        const schedule = registry.getByName("morning-maintenance-batch");

        await expect(
            Promise.resolve(
                schedule?.buildPayload({
                    now: new Date("2026-05-07T00:00:00.000Z"),
                    runKey: "run-morning",
                    scheduleName: "morning-maintenance-batch",
                    scheduledFor: new Date("2026-05-07T00:00:00.000Z"),
                    timezone: "Asia/Shanghai",
                })
            )
        ).resolves.toBeUndefined();
        await expect(
            schedule?.dispatch(undefined, {
                dispatchedAt: "2026-05-07T00:00:00.000Z",
                runKey: "run-morning",
                scheduleName: "morning-maintenance-batch",
                scheduledFor: "2026-05-07T00:00:00.000Z",
                source: "schedule",
            })
        ).resolves.toEqual({
            jobId: null,
            ok: true,
        });
    });
});

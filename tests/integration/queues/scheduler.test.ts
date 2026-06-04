import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    createScheduleRegistry,
    defineSchedule,
} from "@shanjing/astro-full-stack-starter/queue/core";
import { getScheduleRuntimeState } from "@shanjing/astro-full-stack-starter/queue/core";

const { dispatchJobMock } = vi.hoisted(() => ({
    dispatchJobMock: vi.fn(),
}));

vi.mock("@shanjing/astro-full-stack-starter/queue/adapters/bullmq", () => ({
    dispatchJob: dispatchJobMock,
}));

class FakeRedis {
    store = new Map<string, string>();
    hashes = new Map<string, Record<string, string>>();
    sets = new Map<string, Set<string>>();
    expiry = new Map<string, number>();

    private purgeExpiredKeys() {
        const now = Date.now();

        for (const [key, expiresAt] of this.expiry.entries()) {
            if (expiresAt > now) {
                continue;
            }

            this.expiry.delete(key);
            this.store.delete(key);
            this.hashes.delete(key);
            this.sets.delete(key);
        }
    }

    multi() {
        const commands: Array<() => Promise<unknown>> = [];
        const transaction = {
            exec: async () => Promise.all(commands.map(async (command) => command())),
            sadd: (...args: Parameters<FakeRedis["sadd"]>) => {
                commands.push(() => this.sadd(...args));
                return transaction;
            },
            set: (...args: Parameters<FakeRedis["set"]>) => {
                commands.push(() => this.set(...args));
                return transaction;
            },
        };

        return transaction;
    }

    async get(key: string) {
        this.purgeExpiredKeys();
        return this.store.get(key) ?? null;
    }

    async hgetall(key: string) {
        this.purgeExpiredKeys();
        return this.hashes.get(key) ?? {};
    }

    async hset(key: string, values: Record<string, string>) {
        this.purgeExpiredKeys();
        const current = this.hashes.get(key) ?? {};
        this.hashes.set(key, {
            ...current,
            ...values,
        });
        return 1;
    }

    async expire(key: string, ttlSeconds: number) {
        this.expiry.set(key, Date.now() + ttlSeconds * 1000);
        return 1;
    }

    async pexpire(key: string, ttlMs: number) {
        this.expiry.set(key, Date.now() + ttlMs);
        return 1;
    }

    async sadd(key: string, ...members: string[]) {
        this.purgeExpiredKeys();
        const set = this.sets.get(key) ?? new Set<string>();
        for (const member of members) {
            set.add(member);
        }
        this.sets.set(key, set);
        return set.size;
    }

    async set(key: string, value: string, ...args: Array<string | number>) {
        this.purgeExpiredKeys();
        const normalizedArgs = args.map((item) => String(item).toUpperCase());
        const wantsNx = normalizedArgs.includes("NX");
        const pxIndex = normalizedArgs.indexOf("PX");

        if (wantsNx && this.store.has(key)) {
            return null;
        }

        this.store.set(key, value);

        if (pxIndex >= 0 && args[pxIndex + 1] !== undefined) {
            this.expiry.set(key, Date.now() + Number(args[pxIndex + 1]));
        }

        return "OK";
    }

    async smembers(key: string) {
        this.purgeExpiredKeys();
        return [...(this.sets.get(key) ?? new Set<string>())];
    }

    async srem(key: string, ...members: string[]) {
        this.purgeExpiredKeys();
        const set = this.sets.get(key);

        if (!set) {
            return 0;
        }

        let removed = 0;
        for (const member of members) {
            if (set.delete(member)) {
                removed += 1;
            }
        }

        return removed;
    }
}

describe("queue scheduler", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.useFakeTimers();
        dispatchJobMock.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("dispatches each cron slot once", async () => {
        vi.setSystemTime(new Date("2026-04-23T00:15:10.000Z"));
        dispatchJobMock.mockResolvedValue({
            jobId: "schedule:1",
            ok: true,
        });

        const { runSchedulerTick } = await import("@shanjing/astro-full-stack-starter/queue/core");

        const redis = new FakeRedis();
        const registry = createScheduleRegistry();
        registry.register(
            defineSchedule({
                buildPayload: ({ scheduledFor }) => ({
                    scheduledFor: scheduledFor.toISOString(),
                }),
                cron: "15 8 * * *",
                description: "单分钟只派发一次",
                dispatch: dispatchJobMock,
                jobName: "scheduled-job",
                name: "once-per-slot",
                queueName: "critical",
            })
        );

        const firstTick = await runSchedulerTick({
            instanceId: "scheduler-1",
            redis: redis as never,
            registry,
        });
        const secondTick = await runSchedulerTick({
            instanceId: "scheduler-1",
            redis: redis as never,
            registry,
        });
        const state = await getScheduleRuntimeState(redis as never, "once-per-slot");

        expect(firstTick.isLeader).toBe(true);
        expect(firstTick.dispatched).toBe(1);
        expect(secondTick.dispatched).toBe(0);
        expect(dispatchJobMock).toHaveBeenCalledTimes(1);
        expect(state?.lastResult).toBe("dispatched");
        expect(state?.lastJobId).toBe("schedule:1");
    });

    it("records dispatch failures in schedule runtime state", async () => {
        vi.setSystemTime(new Date("2026-04-23T00:15:10.000Z"));
        dispatchJobMock.mockResolvedValue({
            message: "redis down",
            ok: false,
            reason: "connection_error",
        });

        const { runSchedulerTick } = await import("@shanjing/astro-full-stack-starter/queue/core");

        const redis = new FakeRedis();
        const registry = createScheduleRegistry();
        registry.register(
            defineSchedule({
                buildPayload: () => ({
                    status: "needs-review",
                }),
                cron: "15 8 * * *",
                description: "失败状态记录",
                dispatch: dispatchJobMock,
                jobName: "failing-scheduled-job",
                name: "failing-schedule",
                queueName: "critical",
            })
        );

        const summary = await runSchedulerTick({
            instanceId: "scheduler-1",
            redis: redis as never,
            registry,
        });
        const state = await getScheduleRuntimeState(redis as never, "failing-schedule");

        expect(summary.dispatched).toBe(0);
        expect(summary.skipped).toBe(1);
        expect(state?.lastResult).toBe("dispatch_failed");
        expect(state?.lastError).toContain("redis down");
    });

    it("skips schedules when leadership, enablement, cron, or slot locks block dispatch", async () => {
        vi.setSystemTime(new Date("2026-04-23T00:16:10.000Z"));
        dispatchJobMock.mockResolvedValue({
            jobId: "schedule:2",
            ok: true,
        });

        const { runSchedulerTick } = await import("@shanjing/astro-full-stack-starter/queue/core");

        const redis = new FakeRedis();
        const registry = createScheduleRegistry();
        registry.register(
            defineSchedule({
                buildPayload: () => ({}),
                cron: "15 8 * * *",
                description: "cron mismatch",
                dispatch: dispatchJobMock,
                enabledByDefault: false,
                jobName: "disabled-job",
                name: "disabled-schedule",
                queueName: "critical",
            })
        );
        registry.register(
            defineSchedule({
                buildPayload: () => ({}),
                cron: "17 8 * * *",
                description: "cron mismatch",
                dispatch: dispatchJobMock,
                jobName: "mismatch-job",
                name: "mismatch-schedule",
                queueName: "critical",
            })
        );

        const firstTick = await runSchedulerTick({
            instanceId: "scheduler-1",
            redis: redis as never,
            registry,
        });
        const followerTick = await runSchedulerTick({
            instanceId: "scheduler-2",
            redis: redis as never,
            registry,
        });

        expect(firstTick).toEqual({
            dispatched: 0,
            instanceId: "scheduler-1",
            isLeader: true,
            skipped: 2,
        });
        expect(followerTick).toEqual({
            dispatched: 0,
            instanceId: "scheduler-2",
            isLeader: false,
            skipped: 2,
        });
        expect(dispatchJobMock).not.toHaveBeenCalled();
    });

    it("records thrown build payload errors and presents schedule metadata", async () => {
        vi.setSystemTime(new Date("2026-04-23T00:15:10.000Z"));

        const { getSchedulePresentation, runSchedulerTick } =
            await import("@shanjing/astro-full-stack-starter/queue/core");

        const redis = new FakeRedis();
        const registry = createScheduleRegistry();
        registry.register(
            defineSchedule({
                buildPayload: () => {
                    throw new Error("payload failed");
                },
                cron: "15 8 * * *",
                description: "payload error",
                dispatch: dispatchJobMock,
                jobName: "payload-error-job",
                name: "payload-error-schedule",
                queueName: "critical",
            })
        );

        const summary = await runSchedulerTick({
            instanceId: "scheduler-1",
            redis: redis as never,
            registry,
        });
        const state = await getScheduleRuntimeState(redis as never, "payload-error-schedule");

        expect(summary.skipped).toBe(1);
        expect(state?.lastResult).toBe("dispatch_failed");
        expect(state?.lastError).toBe("payload failed");
        registry.register(
            defineSchedule({
                buildPayload: () => ({}),
                cron: "15 8 * * *",
                description: "inline scheduler queue",
                dispatch: dispatchJobMock,
                jobName: "inline",
                name: "inline-schedule",
                queueName: "__inline_callback__",
            })
        );
        expect(getSchedulePresentation(registry, new Date("2026-04-23T00:00:00.000Z"))).toEqual([
            expect.objectContaining({
                enabled: true,
                name: "payload-error-schedule",
                queueName: "critical",
            }),
            expect.objectContaining({
                name: "inline-schedule",
                queueName: "scheduler",
            }),
        ]);
    });

    it("records string payload errors", async () => {
        vi.setSystemTime(new Date("2026-04-23T00:15:10.000Z"));
        const { runSchedulerTick } = await import("@shanjing/astro-full-stack-starter/queue/core");
        const redis = new FakeRedis();
        const registry = createScheduleRegistry();

        registry.register(
            defineSchedule({
                buildPayload: () => {
                    throw "string payload failed";
                },
                cron: "15 8 * * *",
                description: "string payload error",
                dispatch: dispatchJobMock,
                jobName: "string-payload-error-job",
                name: "string-payload-error-schedule",
                queueName: "critical",
            })
        );

        await runSchedulerTick({
            instanceId: "scheduler-1",
            redis: redis as never,
            registry,
        });

        await expect(
            getScheduleRuntimeState(redis as never, "string-payload-error-schedule")
        ).resolves.toEqual(
            expect.objectContaining({
                lastError: "string payload failed",
            })
        );
    });

    it("starts, ticks, logs failures, and closes the scheduler instance", async () => {
        vi.setSystemTime(new Date("2026-04-23T00:15:10.000Z"));
        vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});

        const { startScheduler } = await import("@shanjing/astro-full-stack-starter/queue/core");

        const registry = createScheduleRegistry();
        const instance = startScheduler({
            instanceId: "scheduler-1",
            redis: new FakeRedis() as never,
            registry,
            tickIntervalMs: 1000,
        });

        await instance.tick();
        await vi.advanceTimersByTimeAsync(1000);
        await instance.close();
        await instance.tick();

        expect(instance.instanceId).toBe("scheduler-1");
        expect(console.log).toHaveBeenCalledWith(
            "[scheduler] Tick finished. leader=true dispatched=0 skipped=0."
        );
    });

    it("logs scheduler tick failures from the background loop", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const { startScheduler } = await import("@shanjing/astro-full-stack-starter/queue/core");
        const registry = {
            getAll() {
                throw Object("registry failed");
            },
        };
        const instance = startScheduler({
            instanceId: "scheduler-1",
            redis: new FakeRedis() as never,
            registry: registry as never,
        });

        await instance.tick();
        await instance.close();
        await instance.close();

        expect(console.error).toHaveBeenCalledWith("[scheduler] Tick failed: registry failed");
    });
});

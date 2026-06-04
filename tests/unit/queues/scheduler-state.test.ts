import { beforeEach, describe, expect, it } from "vitest";

import {
    acquireScheduleSlotLock,
    acquireSchedulerLeadership,
    getScheduleRuntimeStates,
    getScheduleRuntimeState,
    getSchedulerHeartbeats,
    getSchedulerLeader,
    recordScheduleAttempt,
    recordScheduleDispatchResult,
    writeSchedulerHeartbeat,
} from "@shanjing/astro-full-stack-starter/queue/core";

class FakeRedis {
    store = new Map<string, string>();
    hashes = new Map<string, Record<string, string>>();
    sets = new Map<string, Set<string>>();
    expireCalls: Array<[string, number]> = [];
    pexpireCalls: Array<[string, number]> = [];

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
        return this.store.get(key) ?? null;
    }

    async hgetall(key: string) {
        return this.hashes.get(key) ?? {};
    }

    async hset(key: string, values: Record<string, string>) {
        const current = this.hashes.get(key) ?? {};
        this.hashes.set(key, {
            ...current,
            ...values,
        });
        return 1;
    }

    async expire(key: string, ttlSeconds: number) {
        this.expireCalls.push([key, ttlSeconds]);
        return 1;
    }

    async pexpire(key: string, ttlMs: number) {
        this.pexpireCalls.push([key, ttlMs]);
        return 1;
    }

    async sadd(key: string, ...members: string[]) {
        const set = this.sets.get(key) ?? new Set<string>();
        for (const member of members) {
            set.add(member);
        }
        this.sets.set(key, set);
        return set.size;
    }

    async set(key: string, value: string, ...args: Array<string | number>) {
        const wantsNx = args.map((item) => String(item).toUpperCase()).includes("NX");

        if (wantsNx && this.store.has(key)) {
            return null;
        }

        this.store.set(key, value);
        return "OK";
    }

    async smembers(key: string) {
        return [...(this.sets.get(key) ?? new Set<string>())];
    }

    async srem(key: string, ...members: string[]) {
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

describe("scheduler state", () => {
    beforeEach(() => {
        delete process.env.REDIS_KEY_PREFIX;
        delete process.env.QUEUE_EXECUTION_RECORD_TTL_SECONDS;
    });

    it("stores heartbeat and leadership information", async () => {
        process.env.REDIS_KEY_PREFIX = "project-a";
        const redis = new FakeRedis();

        const firstLeader = await acquireSchedulerLeadership(redis as never, "scheduler-1", 30_000);
        const secondLeader = await acquireSchedulerLeadership(
            redis as never,
            "scheduler-2",
            30_000
        );

        await writeSchedulerHeartbeat(
            redis as never,
            {
                instanceId: "scheduler-1",
                isLeader: true,
                lastHeartbeatAt: 1000,
            },
            30_000
        );
        await writeSchedulerHeartbeat(
            redis as never,
            {
                instanceId: "scheduler-2",
                isLeader: false,
                lastHeartbeatAt: 2000,
            },
            30_000
        );

        const heartbeats = await getSchedulerHeartbeats(redis as never);

        expect(firstLeader).toBe(true);
        expect(secondLeader).toBe(false);
        expect(redis.store.get("project-a:queue:scheduler:leader")).toBe("scheduler-1");
        expect(redis.sets.get("project-a:queue:scheduler:heartbeats")).toEqual(
            new Set(["scheduler-1", "scheduler-2"])
        );
        expect(redis.pexpireCalls).toEqual([
            ["project-a:queue:scheduler:heartbeats", 30_000],
            ["project-a:queue:scheduler:heartbeats", 30_000],
        ]);
        expect(heartbeats).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    instanceId: "scheduler-1",
                    isLeader: true,
                }),
                expect.objectContaining({
                    instanceId: "scheduler-2",
                    isLeader: false,
                }),
            ])
        );
    });

    it("handles empty, expired, and malformed heartbeat entries", async () => {
        process.env.REDIS_KEY_PREFIX = "project-a";
        const redis = new FakeRedis();

        await expect(getSchedulerHeartbeats(redis as never)).resolves.toEqual([]);

        await redis.sadd(
            "project-a:queue:scheduler:heartbeats",
            "missing-scheduler",
            "bad-json-scheduler"
        );
        await redis.set("project-a:queue:scheduler:heartbeat:bad-json-scheduler", "{bad-json");

        await expect(getSchedulerHeartbeats(redis as never)).resolves.toEqual([]);
        expect(redis.sets.get("project-a:queue:scheduler:heartbeats")).toEqual(
            new Set(["bad-json-scheduler"])
        );
    });

    it("renews leadership for the current leader and exposes slot locks", async () => {
        process.env.REDIS_KEY_PREFIX = "project-a";
        const redis = new FakeRedis();

        await expect(
            acquireSchedulerLeadership(redis as never, "scheduler-1", 30_000)
        ).resolves.toBe(true);
        await expect(
            acquireSchedulerLeadership(redis as never, "scheduler-1", 30_000)
        ).resolves.toBe(true);
        await expect(getSchedulerLeader(redis as never)).resolves.toBe("scheduler-1");
        await expect(
            acquireScheduleSlotLock(redis as never, "health-check", "run-1", 30_000)
        ).resolves.toBe(true);
        await expect(
            acquireScheduleSlotLock(redis as never, "health-check", "run-1", 30_000)
        ).resolves.toBe(false);

        expect(redis.pexpireCalls).toContainEqual(["project-a:queue:scheduler:leader", 30_000]);
    });

    it("records attempts and final dispatch results", async () => {
        process.env.QUEUE_EXECUTION_RECORD_TTL_SECONDS = "900";
        process.env.REDIS_KEY_PREFIX = "project-a";
        const redis = new FakeRedis();
        const scheduleKey = "project-a:queue:scheduler:schedule:health-check";

        await recordScheduleAttempt(redis as never, "health-check", {
            attemptedAt: 1000,
            runKey: "run-1",
            scheduledFor: 900,
        });

        let state = await getScheduleRuntimeState(redis as never, "health-check");
        expect(state?.lastResult).toBe("idle");
        expect(state?.lastRunKey).toBe("run-1");
        expect(redis.expireCalls).toContainEqual([scheduleKey, 900]);

        await recordScheduleDispatchResult(redis as never, "health-check", {
            attemptedAt: 1000,
            dispatchedAt: 1100,
            jobId: "job-1",
            runKey: "run-1",
            scheduledFor: 900,
        });

        state = await getScheduleRuntimeState(redis as never, "health-check");
        expect(state).toEqual(
            expect.objectContaining({
                lastDispatchedAt: 1100,
                lastJobId: "job-1",
                lastResult: "dispatched",
                scheduleName: "health-check",
                scheduledFor: 900,
            })
        );
        expect(redis.expireCalls).toEqual([
            [scheduleKey, 900],
            [scheduleKey, 900],
        ]);
    });

    it("records failed dispatches and hydrates missing runtime state fields", async () => {
        process.env.QUEUE_EXECUTION_RECORD_TTL_SECONDS = "900";
        process.env.REDIS_KEY_PREFIX = "project-a";
        const redis = new FakeRedis();

        await expect(getScheduleRuntimeState(redis as never, "missing")).resolves.toBeNull();

        await recordScheduleDispatchResult(redis as never, "health-check", {
            attemptedAt: 1000,
            error: "dispatch failed",
            runKey: "run-1",
            scheduledFor: 900,
        });
        await redis.hset("project-a:queue:scheduler:schedule:minimal", {
            lastAttemptAt: "bad-number",
            scheduledFor: "also-bad",
        });

        await expect(getScheduleRuntimeState(redis as never, "health-check")).resolves.toEqual({
            lastAttemptAt: 1000,
            lastDispatchedAt: null,
            lastError: "dispatch failed",
            lastJobId: null,
            lastResult: "dispatch_failed",
            lastRunKey: "run-1",
            scheduleName: "health-check",
            scheduledFor: 900,
        });
        await expect(getScheduleRuntimeState(redis as never, "minimal")).resolves.toEqual({
            lastAttemptAt: null,
            lastDispatchedAt: null,
            lastError: "",
            lastJobId: null,
            lastResult: "idle",
            lastRunKey: null,
            scheduleName: "minimal",
            scheduledFor: null,
        });

        const states = await getScheduleRuntimeStates(redis as never, ["health-check", "missing"]);

        expect(states.get("health-check")?.lastResult).toBe("dispatch_failed");
        expect(states.get("missing")).toBeNull();
    });
});

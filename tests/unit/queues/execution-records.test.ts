import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    createQueuedExecutionRecord,
    getCurrentExecutionRecordId,
    getExecutionRecord,
    getExecutionRecordsByStatus,
    getRecentExecutionRecords,
    markExecutionRecordActive,
    markExecutionRecordCompleted,
    markExecutionRecordFailed,
    markExecutionRecordRemoved,
    pruneExecutionRecords,
} from "@shanjing/astro-full-stack-starter/queue/stores/redis";

class FakeRedis {
    expireCalls: Array<[string, number]> = [];
    hashes = new Map<string, Record<string, string>>();
    store = new Map<string, string>();
    zsets = new Map<string, Map<string, number>>();

    multi() {
        const commands: Array<() => Promise<unknown>> = [];
        const transaction = {
            del: (...args: Parameters<FakeRedis["del"]>) => {
                commands.push(() => this.del(...args));
                return transaction;
            },
            exec: async () => Promise.all(commands.map(async (command) => command())),
            expire: (...args: Parameters<FakeRedis["expire"]>) => {
                commands.push(() => this.expire(...args));
                return transaction;
            },
            hset: (...args: Parameters<FakeRedis["hset"]>) => {
                commands.push(() => this.hset(...args));
                return transaction;
            },
            set: (...args: Parameters<FakeRedis["set"]>) => {
                commands.push(() => this.set(...args));
                return transaction;
            },
            zadd: (...args: Parameters<FakeRedis["zadd"]>) => {
                commands.push(() => this.zadd(...args));
                return transaction;
            },
            zrem: (...args: Parameters<FakeRedis["zrem"]>) => {
                commands.push(() => this.zrem(...args));
                return transaction;
            },
        };

        return transaction;
    }

    async del(key: string) {
        const deleted = Number(this.store.delete(key)) + Number(this.hashes.delete(key));
        return deleted;
    }

    async expire(key: string, ttlSeconds: number) {
        this.expireCalls.push([key, ttlSeconds]);
        return 1;
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

    async incr(key: string) {
        const nextValue = Number(this.store.get(key) ?? "0") + 1;
        this.store.set(key, String(nextValue));
        return nextValue;
    }

    async set(key: string, value: string) {
        this.store.set(key, value);
        return "OK";
    }

    async zadd(key: string, score: string, member: string) {
        const zset = this.zsets.get(key) ?? new Map<string, number>();
        zset.set(member, Number(score));
        this.zsets.set(key, zset);
        return 1;
    }

    async zrangebyscore(
        key: string,
        min: string,
        max: string,
        _limitKeyword: "LIMIT",
        offset: number,
        limit: number
    ) {
        const minScore = min === "-inf" ? Number.NEGATIVE_INFINITY : Number(min);
        const maxScore = max === "+inf" ? Number.POSITIVE_INFINITY : Number(max);
        const entries = [...(this.zsets.get(key) ?? new Map<string, number>()).entries()]
            .filter(([, score]) => score >= minScore && score <= maxScore)
            .sort(([, a], [, b]) => a - b)
            .map(([member]) => member);

        return entries.slice(offset, offset + limit);
    }

    async zrevrange(key: string, start: number, stop: number) {
        const entries = [...(this.zsets.get(key) ?? new Map<string, number>()).entries()]
            .sort(([, a], [, b]) => b - a)
            .map(([member]) => member);

        return entries.slice(start, stop + 1);
    }

    async zrem(key: string, member: string) {
        return this.zsets.get(key)?.delete(member) ? 1 : 0;
    }
}

describe("execution records", () => {
    beforeEach(() => {
        delete process.env.REDIS_KEY_PREFIX;
        delete process.env.QUEUE_EXECUTION_RECORD_TTL_SECONDS;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("applies prefixed keys and ttl to execution record writes", async () => {
        process.env.QUEUE_EXECUTION_RECORD_TTL_SECONDS = "900";
        process.env.REDIS_KEY_PREFIX = "project-a";
        const redis = new FakeRedis();

        const record = await createQueuedExecutionRecord(redis as never, {
            attempts: 0,
            data: {
                id: 1,
            },
            failedReason: "",
            finishedAt: null,
            jobId: "job-1",
            jobName: "demo-job",
            opts: {},
            processedAt: null,
            queueName: "default",
            queuedAt: 1000,
            returnValue: null,
            stacktrace: [],
        });

        expect(record.id).toBe("default::job-1::1");
        expect(redis.hashes.has("project-a:queue:execution-records:item:default::job-1::1")).toBe(
            true
        );
        expect(redis.store.get("project-a:queue:execution-records:current:default:job-1")).toBe(
            record.id
        );
        expect(redis.expireCalls).toEqual([
            ["project-a:queue:execution-records:item:default::job-1::1", 900],
            ["project-a:queue:execution-records:status:waiting", 900],
            ["project-a:queue:execution-records:current:default:job-1", 900],
            ["project-a:queue:execution-records:sequence:default:job-1", 900],
        ]);
    });

    it("prunes completed execution records and current pointers", async () => {
        process.env.QUEUE_EXECUTION_RECORD_TTL_SECONDS = "900";
        process.env.REDIS_KEY_PREFIX = "project-a";
        const redis = new FakeRedis();
        const snapshot = {
            attempts: 0,
            data: {
                id: 1,
            },
            failedReason: "",
            finishedAt: null,
            jobId: "job-1",
            jobName: "demo-job",
            opts: {},
            processedAt: null,
            queueName: "default",
            queuedAt: 1000,
            returnValue: null,
            stacktrace: [],
        };

        const record = await createQueuedExecutionRecord(redis as never, snapshot);
        await markExecutionRecordCompleted(redis as never, {
            ...snapshot,
            finishedAt: 2000,
            processedAt: 1500,
            returnValue: {
                ok: true,
            },
        });

        const summary = await pruneExecutionRecords(redis as never, {
            olderThan: Date.now() + 1,
            statuses: ["completed"],
        });

        expect(summary.totalDeleted).toBe(1);
        expect(redis.hashes.has(`project-a:queue:execution-records:item:${record.id}`)).toBe(false);
        expect(
            redis.store.get("project-a:queue:execution-records:current:default:job-1")
        ).toBeUndefined();
        expect(
            redis.zsets.get("project-a:queue:execution-records:status:completed")?.has(record.id)
        ).toBe(false);
    });

    it("moves a stale open record when the current pointer already references a terminal record", async () => {
        process.env.QUEUE_EXECUTION_RECORD_TTL_SECONDS = "900";
        process.env.REDIS_KEY_PREFIX = "project-a";
        const redis = new FakeRedis();
        const snapshot = {
            attempts: 0,
            data: {
                id: 1,
            },
            failedReason: "",
            finishedAt: null,
            jobId: "job-1",
            jobName: "demo-job",
            opts: {},
            processedAt: null,
            queueName: "default",
            queuedAt: 1000,
            returnValue: null,
            stacktrace: [],
        };

        const staleWaiting = await createQueuedExecutionRecord(redis as never, snapshot);
        await redis.incr("project-a:queue:execution-records:sequence:default:job-1");
        await redis.hset("project-a:queue:execution-records:item:default::job-1::2", {
            attempts: "0",
            data: JSON.stringify(snapshot.data),
            executionNumber: "2",
            failedReason: "",
            finishedAt: "2000",
            id: "default::job-1::2",
            jobId: "job-1",
            jobName: "demo-job",
            meta: "",
            opts: JSON.stringify(snapshot.opts),
            processedAt: "1500",
            queueName: "default",
            queuedAt: "1000",
            retryOfRecordId: "",
            returnValue: "",
            sortAt: "2000",
            stacktrace: JSON.stringify([]),
            status: "completed",
        });
        await redis.zadd(
            "project-a:queue:execution-records:status:completed",
            "2000",
            "default::job-1::2"
        );
        await redis.set(
            "project-a:queue:execution-records:current:default:job-1",
            "default::job-1::2"
        );
        await markExecutionRecordCompleted(redis as never, {
            ...snapshot,
            finishedAt: 2200,
            processedAt: 2100,
        });

        const waitingRecords = await getExecutionRecordsByStatus(redis as never, "waiting");
        const completedRecords = await getExecutionRecordsByStatus(redis as never, "completed");

        expect(waitingRecords).toEqual([]);
        expect(completedRecords.map((record) => record.id)).toContain(staleWaiting.id);
        expect(redis.store.get("project-a:queue:execution-records:current:default:job-1")).toBe(
            staleWaiting.id
        );
    });

    it("moves removed jobs out of waiting execution records", async () => {
        process.env.QUEUE_EXECUTION_RECORD_TTL_SECONDS = "900";
        process.env.REDIS_KEY_PREFIX = "project-a";
        const redis = new FakeRedis();
        const snapshot = {
            attempts: 0,
            data: {
                id: 1,
            },
            failedReason: "",
            finishedAt: null,
            jobId: "job-1",
            jobName: "demo-job",
            opts: {},
            processedAt: null,
            queueName: "default",
            queuedAt: 1000,
            returnValue: null,
            stacktrace: [],
        };

        const waitingRecord = await createQueuedExecutionRecord(redis as never, snapshot);
        await markExecutionRecordRemoved(redis as never, {
            ...snapshot,
            finishedAt: 2000,
        });

        const waitingRecords = await getExecutionRecordsByStatus(redis as never, "waiting");
        const removedRecords = await getExecutionRecordsByStatus(redis as never, "removed");

        expect(waitingRecords).toEqual([]);
        expect(removedRecords.map((record) => record.id)).toEqual([waitingRecord.id]);
        expect(removedRecords[0]?.status).toBe("removed");
    });

    it("returns recent execution records across statuses sorted by activity time", async () => {
        process.env.QUEUE_EXECUTION_RECORD_TTL_SECONDS = "900";
        process.env.REDIS_KEY_PREFIX = "project-a";
        const redis = new FakeRedis();
        const snapshot = {
            attempts: 0,
            data: {
                id: 1,
            },
            failedReason: "",
            finishedAt: null,
            jobId: "job-1",
            jobName: "demo-job",
            opts: {},
            processedAt: null,
            queueName: "default",
            queuedAt: 1000,
            returnValue: null,
            stacktrace: [],
        };

        const waitingRecord = await createQueuedExecutionRecord(redis as never, snapshot);
        const completedRecord = await createQueuedExecutionRecord(redis as never, {
            ...snapshot,
            jobId: "job-2",
            queuedAt: 2000,
        });
        await markExecutionRecordCompleted(redis as never, {
            ...snapshot,
            finishedAt: 3000,
            jobId: "job-2",
            processedAt: 2500,
            queuedAt: 2000,
        });

        const records = await getRecentExecutionRecords(redis as never, 10);

        expect(records.map((record) => record.id)).toEqual([completedRecord.id, waitingRecord.id]);
        expect(records.map((record) => record.status)).toEqual(["completed", "waiting"]);
    });

    it("normalizes sparse snapshots and preserves retry metadata", async () => {
        process.env.QUEUE_EXECUTION_RECORD_TTL_SECONDS = "900";
        process.env.REDIS_KEY_PREFIX = "project-a";
        const redis = new FakeRedis();
        const circularData: Record<string, unknown> = {};
        circularData.self = circularData;

        const record = await createQueuedExecutionRecord(
            redis as never,
            {
                attempts: undefined,
                data: undefined,
                failedReason: "",
                finishedAt: undefined,
                jobId: "job-1",
                jobName: "",
                meta: undefined,
                opts: circularData,
                processedAt: undefined,
                queueName: "default",
                queuedAt: undefined,
                returnValue: undefined,
                stacktrace: "not-array",
            } as never,
            {
                retryOfRecordId: "previous-record",
            }
        );
        const hydrated = await getExecutionRecord(redis as never, record.id);

        expect(hydrated).toEqual(
            expect.objectContaining({
                attempts: 0,
                data: null,
                jobName: "unknown",
                meta: null,
                opts: "[object Object]",
                queuedAt: null,
                retryOfRecordId: "previous-record",
                returnValue: null,
                stacktrace: [],
                status: "waiting",
            })
        );
        expect(hydrated?.sortAt).toEqual(expect.any(Number));
    });

    it("moves active and failed records with generated timestamps", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-05-07T12:00:00.000Z"));
        process.env.QUEUE_EXECUTION_RECORD_TTL_SECONDS = "900";
        process.env.REDIS_KEY_PREFIX = "project-a";
        const redis = new FakeRedis();
        const snapshot = {
            attempts: 1,
            data: {
                id: 1,
            },
            failedReason: "",
            finishedAt: null,
            jobId: "job-1",
            jobName: "demo-job",
            opts: {},
            processedAt: null,
            queueName: "default",
            queuedAt: null,
            returnValue: null,
            stacktrace: [],
        };

        await createQueuedExecutionRecord(redis as never, snapshot);
        const activeRecord = await markExecutionRecordActive(redis as never, snapshot);
        const failedRecord = await markExecutionRecordFailed(redis as never, {
            ...snapshot,
            attempts: 2,
            failedReason: "boom",
            returnValue: {
                failed: true,
            },
            stacktrace: ["trace"],
        });

        expect(activeRecord.status).toBe("active");
        expect(activeRecord.processedAt).toBe(Date.now());
        expect(failedRecord.status).toBe("failed");
        expect(failedRecord.finishedAt).toBe(Date.now());
        expect(failedRecord.failedReason).toBe("boom");
        expect(await getCurrentExecutionRecordId(redis as never, "default", "job-1")).toBe(
            failedRecord.id
        );
        expect(await getExecutionRecordsByStatus(redis as never, "active")).toEqual([]);
    });

    it("ignores empty and invalid raw records", async () => {
        process.env.REDIS_KEY_PREFIX = "project-a";
        const redis = new FakeRedis();

        await redis.hset("project-a:queue:execution-records:item:bad-record", {
            id: "bad-record",
        });
        await redis.hset("project-a:queue:execution-records:item:weird-record", {
            attempts: "bad-number",
            data: "{bad-json",
            executionNumber: "bad-number",
            failedReason: "",
            finishedAt: "bad-number",
            id: "weird-record",
            jobId: "job-1",
            jobName: "",
            meta: "{bad-json",
            opts: "{bad-json",
            processedAt: "bad-number",
            queueName: "default",
            queuedAt: "bad-number",
            retryOfRecordId: "",
            returnValue: "",
            sortAt: "bad-number",
            stacktrace: "{bad-json",
            status: "failed",
        });

        await expect(getExecutionRecord(redis as never, "missing-record")).resolves.toBeNull();
        await expect(getExecutionRecord(redis as never, "bad-record")).resolves.toBeNull();
        await expect(getExecutionRecord(redis as never, "weird-record")).resolves.toEqual(
            expect.objectContaining({
                attempts: 0,
                data: "{bad-json",
                executionNumber: 1,
                finishedAt: null,
                jobName: "unknown",
                meta: "{bad-json",
                opts: "{bad-json",
                queuedAt: null,
                stacktrace: [],
            })
        );
    });

    it("sorts removed records by queued time or current time when no terminal time exists", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-05-07T12:00:00.000Z"));
        process.env.REDIS_KEY_PREFIX = "project-a";
        const redis = new FakeRedis();
        const snapshot = {
            attempts: 0,
            data: {},
            failedReason: "",
            finishedAt: null,
            jobId: "job-1",
            jobName: "demo-job",
            opts: {},
            processedAt: null,
            queueName: "default",
            queuedAt: 1000,
            returnValue: null,
            stacktrace: [],
        };

        await createQueuedExecutionRecord(redis as never, snapshot);
        const queuedSortRecord = await markExecutionRecordRemoved(redis as never, snapshot);
        const nowSortRecord = await markExecutionRecordRemoved(redis as never, {
            ...snapshot,
            jobId: "job-2",
            queuedAt: null,
        });

        expect(queuedSortRecord.sortAt).toBe(1000);
        expect(nowSortRecord.sortAt).toBe(Date.now());
    });

    it("handles default pruning options, empty status sets, and stale index members", async () => {
        process.env.REDIS_KEY_PREFIX = "project-a";
        const redis = new FakeRedis();

        await expect(
            pruneExecutionRecords(redis as never, {
                olderThan: 1000,
            })
        ).resolves.toEqual({
            deletedByStatus: {
                completed: 0,
                failed: 0,
            },
            totalDeleted: 0,
        });

        await redis.zadd("project-a:queue:execution-records:status:failed", "500", "stale-record");

        await expect(
            pruneExecutionRecords(redis as never, {
                olderThan: 1000,
                statuses: ["failed"],
            })
        ).resolves.toEqual({
            deletedByStatus: {
                failed: 1,
            },
            totalDeleted: 1,
        });
        expect(redis.zsets.get("project-a:queue:execution-records:status:failed")?.size).toBe(0);
    });

    it("keeps current pointers when pruning older non-current records", async () => {
        process.env.REDIS_KEY_PREFIX = "project-a";
        const redis = new FakeRedis();
        const snapshot = {
            attempts: 0,
            data: {},
            failedReason: "",
            finishedAt: null,
            jobId: "job-1",
            jobName: "demo-job",
            opts: {},
            processedAt: null,
            queueName: "default",
            queuedAt: 1000,
            returnValue: null,
            stacktrace: [],
        };
        const record = await createQueuedExecutionRecord(redis as never, snapshot);

        await markExecutionRecordCompleted(redis as never, {
            ...snapshot,
            finishedAt: 2000,
            processedAt: 1500,
        });
        await redis.set("project-a:queue:execution-records:current:default:job-1", "other");

        await expect(
            pruneExecutionRecords(redis as never, {
                olderThan: 3000,
                statuses: ["completed"],
            })
        ).resolves.toEqual({
            deletedByStatus: {
                completed: 1,
            },
            totalDeleted: 1,
        });
        expect(redis.store.get("project-a:queue:execution-records:current:default:job-1")).toBe(
            "other"
        );
        expect(redis.hashes.has(`project-a:queue:execution-records:item:${record.id}`)).toBe(false);
    });
});

import { describe, expect, it } from "vitest";

import {
    floorToMinute,
    getNextCronRun,
    matchesCronExpression,
    parseCronExpression,
} from "@shanjing/astro-full-stack-starter/queue/core";

describe("queue cron helpers", () => {
    it("matches cron expressions in Asia/Shanghai", () => {
        const scheduledAt = new Date("2026-04-23T00:15:00.000Z");

        expect(matchesCronExpression(scheduledAt, "15 8 * * *", "Asia/Shanghai")).toBe(true);
        expect(matchesCronExpression(scheduledAt, "16 8 * * *", "Asia/Shanghai")).toBe(false);
    });

    it("computes the next run after the given time", () => {
        const current = new Date("2026-04-23T00:15:10.000Z");
        const nextRun = getNextCronRun("15 8 * * *", "Asia/Shanghai", current);

        expect(nextRun.toISOString()).toBe("2026-04-24T00:15:00.000Z");
    });

    it("parses stepped cron fields and floors dates to the minute", () => {
        const parsed = parseCronExpression("*/15 9-18 * * 1-5");
        const current = new Date("2026-04-23T01:16:48.500Z");

        expect(parsed.minute.has(0)).toBe(true);
        expect(parsed.minute.has(15)).toBe(true);
        expect(parsed.hour.has(9)).toBe(true);
        expect(parsed.hour.has(18)).toBe(true);
        expect(floorToMinute(current).toISOString()).toBe("2026-04-23T01:16:00.000Z");
    });

    it("supports comma fields, Sunday normalization, cache reuse, and day matching rules", () => {
        const parsed = parseCronExpression("0,30 8 1 1 7");
        const sameParsed = parseCronExpression("0,30 8 1 1 7");

        expect(sameParsed).toBe(parsed);
        expect(parsed.dayOfWeek.has(0)).toBe(true);
        expect(
            matchesCronExpression(new Date("2027-01-01T00:00:00.000Z"), parsed, "Asia/Shanghai")
        ).toBe(true);
        expect(matchesCronExpression(new Date("2026-05-03T00:00:00.000Z"), "0 8 * * 0")).toBe(true);
        expect(matchesCronExpression(new Date("2026-05-01T00:00:00.000Z"), "0 8 1 * *")).toBe(true);
        expect(matchesCronExpression(new Date("2026-05-02T00:00:00.000Z"), "0 8 1 * 0")).toBe(
            false
        );
        expect(
            getNextCronRun(parsed, "Asia/Shanghai", new Date("2026-12-31T23:50:00.000Z"))
        ).toBeInstanceOf(Date);
    });

    it("rejects invalid cron expressions", () => {
        expect(() => parseCronExpression("")).toThrow("Cron 表达式必须包含 5 个字段");
        expect(() => parseCronExpression("* * * *")).toThrow("Cron 表达式必须包含 5 个字段");
        expect(() => parseCronExpression("*/0 * * * *")).toThrow("Cron 步长无效");
        expect(() => parseCronExpression("61 * * * *")).toThrow("Cron 范围无效");
        expect(() => parseCronExpression("10-5 * * * *")).toThrow("Cron 范围无效");
        expect(parseCronExpression("1,,2 * * * *").minute).toEqual(new Set([1, 2]));
    });
});

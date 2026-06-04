import { afterEach, describe, expect, it, vi } from "vitest";

import {
    getQueueConfig,
    isQueueName,
    parseQueueNames,
    queueNames,
} from "@shanjing/astro-full-stack-starter/queue/core";
import { createJobRegistry } from "@shanjing/astro-full-stack-starter/queue/core";

describe("queue registry", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("keeps registration tolerant when the queue map changes during registration", () => {
        const registry = createJobRegistry();
        const hasSpy = vi.spyOn(Map.prototype, "has");

        hasSpy.mockReturnValueOnce(true);
        registry.register(
            {
                name: "transient-job",
                params: {
                    parse: (value: unknown) => value,
                } as never,
                queueName: "default",
            },
            vi.fn()
        );

        expect(registry.get("default", "transient-job")).toBeUndefined();
        expect(registry.getQueueNames()).toEqual([]);
    });
});

describe("queue names", () => {
    it("parses comma separated queue values and keeps declaration order", () => {
        const result = parseQueueNames(["default, critical", "low", "default"]);

        expect(result).toEqual({
            invalidQueueNames: [],
            queueNames: ["default", "critical", "low"],
        });
    });

    it("collects invalid queues for caller feedback", () => {
        const result = parseQueueNames(["default, urgent", "critical", "oops"]);

        expect(result).toEqual({
            invalidQueueNames: ["urgent", "oops"],
            queueNames: ["default", "critical"],
        });
    });

    it("returns the configured queue metadata", () => {
        expect([...queueNames]).toEqual(["critical", "default", "low"]);
        expect(getQueueConfig("default")).toEqual({
            concurrency: 5,
            description: "默认优先级任务队列",
            instances: 3,
            maxMemory: "500M",
            name: "default",
        });
        expect(isQueueName("critical")).toBe(true);
        expect(isQueueName("unknown")).toBe(false);
    });
});

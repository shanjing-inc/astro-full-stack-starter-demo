import { afterEach, describe, expect, it, vi } from "vitest";

import { createBatchLoader } from "@shanjing/astro-full-stack-starter/graphql/loaders/batch";

describe("batch loader", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("batches work scheduled in the same microtask and reuses the cache", async () => {
        const batchLoad = vi.fn(async (keys: readonly number[]) => {
            return new Map(
                keys.map((key) => [
                    key,
                    {
                        id: key,
                    },
                ])
            );
        });
        const loader = createBatchLoader<number, { id: number }>({
            batchLoad,
        });

        const [first, second, third] = await Promise.all([
            loader.load(1),
            loader.load(1),
            loader.load(2),
        ]);

        expect(first).toEqual({
            id: 1,
        });
        expect(second).toEqual({
            id: 1,
        });
        expect(third).toEqual({
            id: 2,
        });
        expect(batchLoad).toHaveBeenCalledTimes(1);
        expect(batchLoad).toHaveBeenCalledWith([1, 2]);
    });

    it("uses the configured default value for missing records", async () => {
        const loader = createBatchLoader<number, number>({
            batchLoad: async () => new Map<number, number>([[1, 10]]),
            defaultValue: (key) => key * -1,
        });

        await expect(loader.load(2)).resolves.toBe(-2);
    });

    it("rejects missing records when no default value is configured", async () => {
        const loader = createBatchLoader<number, number>({
            batchLoad: async () => new Map<number, number>(),
        });

        await expect(loader.load(2)).rejects.toThrow("Missing batch result for key: 2");
    });

    it("supports priming, clearing, loadMany, and custom cache keys", async () => {
        const batchLoad = vi.fn(async (keys: readonly { id: number }[]) => {
            return new Map(keys.map((key) => [key, key.id * 10]));
        });
        const loader = createBatchLoader<{ id: number }, number>({
            batchLoad,
            getCacheKey: (key) => String(key.id),
        });

        loader.prime({ id: 1 }, 100);
        loader.prime({ id: 1 }, 999);
        await expect(loader.load({ id: 1 })).resolves.toBe(100);
        expect(batchLoad).not.toHaveBeenCalled();

        loader.clear({ id: 1 });
        await expect(loader.load({ id: 1 })).resolves.toBe(10);
        expect(batchLoad).toHaveBeenCalledWith([{ id: 1 }]);

        loader.prime({ id: 2 }, Promise.resolve(200));
        loader.clearMany([{ id: 1 }, { id: 2 }]);

        await expect(loader.loadMany([{ id: 1 }, { id: 2 }])).resolves.toEqual([10, 20]);
    });

    it("drops failed cache entries so the caller can retry", async () => {
        const batchLoad = vi
            .fn<(keys: readonly number[]) => Promise<ReadonlyMap<number, number>>>()
            .mockRejectedValueOnce(new Error("temporary failure"))
            .mockResolvedValueOnce(new Map<number, number>([[1, 100]]));
        const loader = createBatchLoader<number, number>({
            batchLoad,
        });

        await expect(loader.load(1)).rejects.toThrow("temporary failure");
        await expect(loader.load(1)).resolves.toBe(100);
        expect(batchLoad).toHaveBeenCalledTimes(2);
    });

    it("ignores a scheduled dispatch when pending work has already disappeared", async () => {
        const originalSet = Map.prototype.set;
        let setCalls = 0;
        vi.spyOn(Map.prototype, "set").mockImplementation(function (
            this: Map<unknown, unknown>,
            key: unknown,
            value: unknown
        ) {
            setCalls += 1;

            if (setCalls === 2) {
                return this;
            }

            return originalSet.call(this, key, value);
        });
        const batchLoad = vi.fn(async () => new Map<number, number>());
        const loader = createBatchLoader<number, number>({
            batchLoad,
        });

        void loader.load(1);
        await new Promise((resolve) => {
            queueMicrotask(() => resolve(undefined));
        });

        expect(batchLoad).not.toHaveBeenCalled();
    });
});

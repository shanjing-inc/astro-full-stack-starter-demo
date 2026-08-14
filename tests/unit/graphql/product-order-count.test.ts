import { createRequire } from "node:module";

import { initContextCache } from "@pothos/core";
import { SQLiteDialect } from "drizzle-orm/sqlite-core";
import { describe, expect, it, vi } from "vitest";

import { order } from "@/db/schemas";
import { memberSchema } from "@/graphql/schemas/member";

const require = createRequire(import.meta.url);
const graphqlRuntime = require("graphql") as typeof import("graphql");

function createDatabase(
    productIds: number[],
    rows: Array<{ productId: number; orderCount: number }>
) {
    const groupBy = vi.fn().mockResolvedValue(rows);
    const where = vi.fn((_condition?: unknown) => ({ groupBy }));
    const from = vi.fn((_table?: unknown) => ({ where }));
    const select = vi.fn((_selection?: unknown) => ({ from }));
    const findMany = vi.fn().mockResolvedValue(productIds.map((id) => ({ id })));

    return {
        db: {
            query: {
                product: {
                    findMany,
                },
            },
            select,
        },
        findMany,
        from,
        groupBy,
        select,
        where,
    };
}

function expectGroupedOrderCountQuery(
    database: ReturnType<typeof createDatabase>,
    productIds: number[]
) {
    const dialect = new SQLiteDialect();
    const selection = database.select.mock.calls[0]?.[0] as {
        orderCount: Parameters<SQLiteDialect["sqlToQuery"]>[0];
        productId: unknown;
    };
    const condition = database.where.mock.calls[0]?.[0] as Parameters<
        SQLiteDialect["sqlToQuery"]
    >[0];

    expect(selection.productId).toBe(order.productId);
    expect(dialect.sqlToQuery(selection.orderCount)).toEqual({
        params: [],
        sql: 'count("order"."id")',
    });
    expect(database.from).toHaveBeenCalledWith(order);
    expect(dialect.sqlToQuery(condition)).toEqual({
        params: productIds,
        sql: `"order"."product_id" in (${productIds.map(() => "?").join(", ")})`,
    });
    expect(database.groupBy).toHaveBeenCalledWith(order.productId);
}

async function executeListProducts(
    database: object,
    contextCache = initContextCache(),
    selection = "id orderCount"
) {
    return graphqlRuntime.execute({
        contextValue: {
            ...contextCache,
            db: database,
        },
        document: graphqlRuntime.parse(`{ listProducts { ${selection} } }`),
        schema: memberSchema,
    });
}

describe("Cloudflare D1 ProductItem.orderCount", () => {
    it("exposes a non-null Int field in the GraphQL schema", () => {
        const productItem = memberSchema.getType("ProductItem") as
            { getFields: () => Record<string, { type: { toString(): string } }> } | undefined;

        expect(productItem).toBeDefined();
        expect(productItem?.getFields().orderCount?.type.toString()).toBe("Int!");
    });

    it("batches product ids, restores input order, and fills missing products with zero", async () => {
        const database = createDatabase(
            [3, 7, 11, 3],
            [
                { productId: 7, orderCount: 2 },
                { productId: 3, orderCount: 5 },
            ]
        );
        const result = await executeListProducts(database.db);

        expect(result.errors).toBeUndefined();
        expect(result.data?.listProducts).toEqual([
            { id: "3", orderCount: 5 },
            { id: "7", orderCount: 2 },
            { id: "11", orderCount: 0 },
            { id: "3", orderCount: 5 },
        ]);
        expect(database.select).toHaveBeenCalledTimes(1);
        expect(database.from).toHaveBeenCalledTimes(1);
        expect(database.groupBy).toHaveBeenCalledTimes(1);
        expect(database.where).toHaveBeenCalledTimes(1);
        expectGroupedOrderCountQuery(database, [3, 7, 11]);
    });

    it("keeps the product id available when only orderCount is requested", async () => {
        const database = createDatabase([3], [{ productId: 3, orderCount: 5 }]);
        const result = await executeListProducts(database.db, initContextCache(), "orderCount");
        const query = database.findMany.mock.calls[0]?.[0] as
            { columns?: { id?: boolean } } | undefined;

        expect(result.errors).toBeUndefined();
        expect(result.data?.listProducts).toEqual([{ orderCount: 5 }]);
        expect(query?.columns?.id).toBe(true);
    });

    it("skips the grouped query when the product list is empty", async () => {
        const database = createDatabase([], []);
        const result = await executeListProducts(database.db);

        expect(result.errors).toBeUndefined();
        expect(result.data?.listProducts).toEqual([]);
        expect(database.select).not.toHaveBeenCalled();
    });

    it("retries a failed key on the next field load in the same context cache", async () => {
        const database = createDatabase([3], []);
        database.groupBy
            .mockRejectedValueOnce(new Error("D1 unavailable"))
            .mockResolvedValueOnce([{ productId: 3, orderCount: 6 }]);
        const contextCache = initContextCache();
        const firstResult = await executeListProducts(database.db, contextCache);
        const secondResult = await executeListProducts(database.db, contextCache);

        expect(firstResult.errors?.[0]?.message).toBe("D1 unavailable");
        expect(secondResult.errors).toBeUndefined();
        expect(secondResult.data?.listProducts).toEqual([{ id: "3", orderCount: 6 }]);
        expect(database.groupBy).toHaveBeenCalledTimes(2);
    });

    it("reuses cached field results within one request cache", async () => {
        const database = createDatabase([3], [{ productId: 3, orderCount: 6 }]);
        const contextCache = initContextCache();
        const firstResult = await executeListProducts(database.db, contextCache);
        const secondResult = await executeListProducts(database.db, contextCache);

        expect(firstResult.errors).toBeUndefined();
        expect(secondResult.errors).toBeUndefined();
        expect(database.select).toHaveBeenCalledTimes(1);
        expect(database.groupBy).toHaveBeenCalledTimes(1);
    });

    it("isolates DataLoader results between independent request caches", async () => {
        const database = createDatabase([3], [{ productId: 3, orderCount: 6 }]);

        await executeListProducts(database.db);
        await executeListProducts(database.db);

        expect(database.select).toHaveBeenCalledTimes(2);
        expect(database.groupBy).toHaveBeenCalledTimes(2);
    });
});

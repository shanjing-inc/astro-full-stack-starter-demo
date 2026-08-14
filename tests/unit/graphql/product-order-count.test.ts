import { createRequire } from "node:module";

import { initContextCache } from "@pothos/core";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { describe, expect, it, vi } from "vitest";

import { order } from "@/db/schemas";

const { database, groupBy, createGraphQLContext } = vi.hoisted(() => {
    const groupBy = vi.fn().mockResolvedValue([
        { orderCount: "4", productId: 1 },
        { orderCount: 2, productId: 2 },
    ]);
    const where = vi.fn(() => ({ groupBy }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const findMany = vi.fn().mockResolvedValue([
        {
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            id: 1,
            inventoryCount: 10,
            name: "Product 1",
            priceInCents: 100,
            shopId: 1,
            sku: "SKU-1",
            status: "active",
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        {
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            id: 2,
            inventoryCount: 20,
            name: "Product 2",
            priceInCents: 200,
            shopId: 1,
            sku: "SKU-2",
            status: "active",
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
    ]);
    const database = {
        query: {
            product: {
                findMany,
            },
        },
        select,
    };
    const createGraphQLContext = vi.fn((request: Request, cache: object) => ({
        ...cache,
        createDashboardUser: vi.fn(),
        db: database,
        request,
        session: null,
        sessionUser: null,
    }));

    return { createGraphQLContext, database, groupBy };
});

vi.mock("@/graphql/context", () => ({
    createGraphQLContext,
}));
vi.mock("@/graphql/sentry-plugin", () => ({
    useSentryGraphQL: vi.fn(() => ({})),
}));

import { adminSchema } from "@/graphql/schemas/admin";
import { adapter as adminAdapter } from "@/graphql/adapters/admin";

const require = createRequire(import.meta.url);
const graphqlRuntime = require("graphql") as typeof import("graphql");
const yogaRuntime = require("graphql-yoga") as typeof import("graphql-yoga");
const nativeExecutionPlugin = {
    onExecute({
        setExecuteFn,
    }: {
        setExecuteFn: (execute: typeof graphqlRuntime.execute) => void;
    }) {
        setExecuteFn(graphqlRuntime.execute);
    },
    onSubscribe({
        setSubscribeFn,
    }: {
        setSubscribeFn: (subscribe: typeof graphqlRuntime.subscribe) => void;
    }) {
        setSubscribeFn(graphqlRuntime.subscribe);
    },
} satisfies import("graphql-yoga").Plugin;

function createProductRecord(id: number) {
    return {
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        id,
        inventoryCount: 10,
        name: `Product ${id}`,
        priceInCents: 100,
        shopId: 1,
        sku: `SKU-${id}`,
        status: "active",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
}

function createProductDatabase(productIds: number[], groupBy: ReturnType<typeof vi.fn>) {
    const where = vi.fn((_condition?: unknown) => ({ groupBy }));
    const from = vi.fn((_table?: unknown) => ({ where }));
    const select = vi.fn((_selection?: unknown) => ({ from }));
    const findMany = vi.fn().mockResolvedValue(productIds.map(createProductRecord));

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
    database: ReturnType<typeof createProductDatabase>,
    productIds: number[]
) {
    const dialect = new MySqlDialect();
    const selection = database.select.mock.calls[0]?.[0] as {
        orderCount: Parameters<MySqlDialect["sqlToQuery"]>[0];
        productId: unknown;
    };
    const condition = database.where.mock.calls[0]?.[0] as Parameters<
        MySqlDialect["sqlToQuery"]
    >[0];

    expect(selection.productId).toBe(order.productId);
    expect(dialect.sqlToQuery(selection.orderCount)).toEqual({
        params: [],
        sql: "count(`order`.`id`)",
    });
    expect(database.from).toHaveBeenCalledWith(order);
    expect(dialect.sqlToQuery(condition)).toEqual({
        params: productIds,
        sql: `\`order\`.\`product_id\` in (${productIds.map(() => "?").join(", ")})`,
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
        schema: adminSchema,
    });
}

describe("ProductItem.orderCount", () => {
    it("exposes a non-null Int field in the GraphQL schema", () => {
        const productItem = adminSchema.getType("ProductItem") as
            { getFields: () => Record<string, { type: { toString(): string } }> } | undefined;

        expect(productItem).toBeDefined();
        expect(productItem?.getFields().orderCount?.type.toString()).toBe("Int!");
    });

    it("loads counts in one grouped query, preserves input order, and fills missing products with zero", async () => {
        const groupBy = vi.fn().mockResolvedValue([
            { orderCount: "4", productId: 1 },
            { orderCount: 2, productId: 3 },
        ]);
        const database = createProductDatabase([3, 2, 1, 3], groupBy);
        const result = await executeListProducts(database.db);

        expect(result.errors).toBeUndefined();
        expect(result.data?.listProducts).toEqual([
            { id: "3", orderCount: 2 },
            { id: "2", orderCount: 0 },
            { id: "1", orderCount: 4 },
            { id: "3", orderCount: 2 },
        ]);
        expect(database.select).toHaveBeenCalledTimes(1);
        expect(groupBy).toHaveBeenCalledTimes(1);
        expectGroupedOrderCountQuery(database, [3, 2, 1]);
    });

    it("keeps the product id available when only orderCount is requested", async () => {
        const groupBy = vi.fn().mockResolvedValue([{ orderCount: 5, productId: 3 }]);
        const database = createProductDatabase([3], groupBy);
        const result = await executeListProducts(database.db, initContextCache(), "orderCount");
        const query = database.findMany.mock.calls[0]?.[0] as
            { columns?: { id?: boolean } } | undefined;

        expect(result.errors).toBeUndefined();
        expect(result.data?.listProducts).toEqual([{ orderCount: 5 }]);
        expect(query?.columns?.id).toBe(true);
    });

    it("skips the grouped query when the product list is empty", async () => {
        const database = createProductDatabase([], vi.fn().mockResolvedValue([]));
        const result = await executeListProducts(database.db);

        expect(result.errors).toBeUndefined();
        expect(result.data?.listProducts).toEqual([]);
        expect(database.select).not.toHaveBeenCalled();
    });

    it("lets a failed count query retry on the next field load", async () => {
        const groupBy = vi
            .fn<() => Promise<Array<{ orderCount: number; productId: number }>>>()
            .mockRejectedValueOnce(new Error("temporary failure"))
            .mockResolvedValueOnce([{ orderCount: 3, productId: 7 }]);
        const database = createProductDatabase([7], groupBy);
        const contextCache = initContextCache();
        const firstResult = await executeListProducts(database.db, contextCache);
        const secondResult = await executeListProducts(database.db, contextCache);

        expect(firstResult.errors?.[0]?.message).toBe("temporary failure");
        expect(secondResult.errors).toBeUndefined();
        expect(secondResult.data?.listProducts).toEqual([{ id: "7", orderCount: 3 }]);
        expect(groupBy).toHaveBeenCalledTimes(2);
    });

    it("isolates DataLoader results between independent request caches", async () => {
        const groupBy = vi.fn().mockResolvedValue([{ orderCount: 3, productId: 7 }]);
        const database = createProductDatabase([7], groupBy);

        await executeListProducts(database.db);
        await executeListProducts(database.db);

        expect(database.select).toHaveBeenCalledTimes(2);
        expect(groupBy).toHaveBeenCalledTimes(2);
    });

    it("shares the DataLoader cache across a real Yoga HTTP batch", async () => {
        const yoga = yogaRuntime.createYoga({
            batching: adminAdapter.batching,
            context: adminAdapter.context,
            graphqlEndpoint: "/graphql",
            plugins: [nativeExecutionPlugin],
            schema: adminSchema,
        });
        const request = new Request("https://example.test/graphql", {
            body: JSON.stringify([
                { query: "{ listProducts { id orderCount } }" },
                { query: "{ listProducts { id orderCount } }" },
            ]),
            headers: {
                "content-type": "application/json",
            },
            method: "POST",
        });

        const response = await yoga.fetch(request);
        const body = (await response.json()) as Array<{
            data?: {
                listProducts: Array<{ id: string; orderCount: number }>;
            };
            errors?: Array<{ message: string }>;
        }>;

        expect(response.status).toBe(200);
        expect(body).toHaveLength(2);
        expect(body.every((entry) => entry.errors === undefined)).toBe(true);
        expect(body.map((entry) => entry.data?.listProducts)).toEqual([
            [
                { id: "1", orderCount: 4 },
                { id: "2", orderCount: 2 },
            ],
            [
                { id: "1", orderCount: 4 },
                { id: "2", orderCount: 2 },
            ],
        ]);
        expect(createGraphQLContext).toHaveBeenCalledTimes(2);
        expect(createGraphQLContext.mock.results[0]?.value).toBeDefined();
        expect(createGraphQLContext.mock.results[1]?.value).toBeDefined();
        expect(
            (createGraphQLContext.mock.results[0]?.value as { [key: symbol]: unknown })[
                Object.getOwnPropertySymbols(createGraphQLContext.mock.results[0]?.value)[0]!
            ]
        ).toBe(
            (createGraphQLContext.mock.results[1]?.value as { [key: symbol]: unknown })[
                Object.getOwnPropertySymbols(createGraphQLContext.mock.results[1]?.value)[0]!
            ]
        );
        expect(database.select).toHaveBeenCalledTimes(1);
        expect(groupBy).toHaveBeenCalledTimes(1);
    });
});

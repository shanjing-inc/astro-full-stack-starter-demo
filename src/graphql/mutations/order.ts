import { inArray } from "drizzle-orm";

import { order, product } from "@/db/schemas";
import {
    buildOrderRelationWhere,
    buildRequiredOrderWhereClause,
    parseCreateOrderSetInput,
    parseOrderMutationWhereInput,
    parseUpdateOrderSetInput,
} from "@/graphql/types/order";

import type { PothosBuilder } from "@/graphql/builder";
import type { OrderTypes } from "@/graphql/types/order";

type OrderOwnershipPair = {
    productId: number;
    shopId: number;
};

type ExistingOrderOwnershipRow = {
    id: number;
    productId: number;
    shopId: number;
};

function buildUniqueOwnershipPairs(pairs: OrderOwnershipPair[]) {
    return [...new Map(pairs.map((pair) => [`${pair.shopId}:${pair.productId}`, pair])).values()];
}

async function assertOrderOwnershipPairs(
    db: Pick<typeof import("@/db/client").db, "select">,
    pairs: OrderOwnershipPair[]
) {
    const uniquePairs = buildUniqueOwnershipPairs(pairs);

    if (uniquePairs.length === 0) {
        return;
    }

    const productIds = [...new Set(uniquePairs.map((pair) => pair.productId))];
    const productRows = await db
        .select({
            id: product.id,
            shopId: product.shopId,
        })
        .from(product)
        .where(inArray(product.id, productIds));
    const productShopIdMap = new Map(productRows.map((row) => [row.id, row.shopId]));

    for (const pair of uniquePairs) {
        const actualShopId = productShopIdMap.get(pair.productId);

        if (actualShopId === undefined) {
            throw new Error(`Product ${pair.productId} does not exist.`);
        }

        if (actualShopId !== pair.shopId) {
            throw new Error(`Product ${pair.productId} does not belong to shop ${pair.shopId}.`);
        }
    }
}

function buildUpdatedOrderOwnershipPairs(
    matchedRows: ExistingOrderOwnershipRow[],
    set: {
        productId?: number | null;
        shopId?: number | null;
    }
) {
    return matchedRows.map((row) => ({
        productId: set.productId ?? row.productId,
        shopId: set.shopId ?? row.shopId,
    }));
}

export function registerCreateOrderMutation(builder: PothosBuilder, orderTypes: OrderTypes) {
    builder.mutationField("createOrder", (t) =>
        t.drizzleField({
            type: orderTypes.orderItem,
            nullable: false,
            args: {
                set: t.arg({
                    type: orderTypes.createOrderSetInput,
                    required: true,
                }),
            },
            resolve: async (query, _root, args, context) => {
                const parsedSet = parseCreateOrderSetInput(args.set);

                return context.db.transaction(async (tx) => {
                    await assertOrderOwnershipPairs(tx, [
                        {
                            productId: parsedSet.productId,
                            shopId: parsedSet.shopId,
                        },
                    ]);

                    const insertedRecords = await tx.insert(order).values(parsedSet).$returningId();
                    const createdRecord = insertedRecords[0];

                    if (!createdRecord) {
                        throw new Error("Failed to create order.");
                    }

                    const record = await tx.query.order.findFirst({
                        ...query,
                        where: {
                            id: createdRecord.id,
                        },
                    });

                    if (!record) {
                        throw new Error("Created order could not be loaded.");
                    }

                    return record;
                });
            },
        })
    );
}

export function registerDeleteOrderMutation(builder: PothosBuilder, orderTypes: OrderTypes) {
    builder.mutationField("deleteOrder", (t) =>
        t.drizzleField({
            type: [orderTypes.orderItem],
            nullable: {
                items: false,
                list: false,
            },
            args: {
                where: t.arg({
                    type: orderTypes.orderFilters,
                    required: true,
                }),
            },
            resolve: async (query, _root, args, context) => {
                const parsedWhere = parseOrderMutationWhereInput(args.where);
                const relationWhere = buildOrderRelationWhere(parsedWhere);
                const whereClause = buildRequiredOrderWhereClause(parsedWhere);
                const matchedRows = await context.db
                    .select({ id: order.id })
                    .from(order)
                    .where(whereClause);

                if (matchedRows.length === 0) {
                    return [];
                }

                const records = await context.db.query.order.findMany({
                    ...query,
                    where: relationWhere as never,
                });

                await context.db.delete(order).where(
                    inArray(
                        order.id,
                        matchedRows.map((row) => row.id)
                    )
                );

                return records;
            },
        })
    );
}

export function registerUpdateOrderMutation(builder: PothosBuilder, orderTypes: OrderTypes) {
    builder.mutationField("updateOrder", (t) =>
        t.drizzleField({
            type: [orderTypes.orderItem],
            nullable: {
                items: false,
                list: false,
            },
            args: {
                set: t.arg({
                    type: orderTypes.updateOrderSetInput,
                    required: true,
                }),
                where: t.arg({
                    type: orderTypes.orderFilters,
                    required: true,
                }),
            },
            resolve: async (query, _root, args, context) => {
                const parsedSet = parseUpdateOrderSetInput(args.set);
                const parsedWhere = parseOrderMutationWhereInput(args.where);
                const whereClause = buildRequiredOrderWhereClause(parsedWhere);

                return context.db.transaction(async (tx) => {
                    const matchedRows = await tx
                        .select({
                            id: order.id,
                            productId: order.productId,
                            shopId: order.shopId,
                        })
                        .from(order)
                        .where(whereClause);

                    if (matchedRows.length === 0) {
                        return [];
                    }

                    await assertOrderOwnershipPairs(
                        tx,
                        buildUpdatedOrderOwnershipPairs(matchedRows, parsedSet)
                    );

                    await tx.update(order).set(parsedSet).where(whereClause);

                    const updatedRecords = await Promise.all(
                        matchedRows.map((row) =>
                            tx.query.order.findFirst({
                                ...query,
                                where: {
                                    id: row.id,
                                },
                            })
                        )
                    );

                    return updatedRecords.filter((record) => record !== undefined);
                });
            },
        })
    );
}

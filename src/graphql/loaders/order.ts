import { asc, inArray } from "drizzle-orm";

import { order } from "@/db/schemas";
import { createBatchLoader } from "@shanjing/astro-full-stack-starter/graphql/loaders/batch";

import type { Database } from "@/db/client";
import type { Order } from "@/db/schemas";

export function createOrderLoaders(database: Database) {
    return {
        orderById: createBatchLoader<number, Order | null>({
            batchLoad: async (keys) => {
                const records = await database
                    .select()
                    .from(order)
                    .where(inArray(order.id, [...keys]))
                    .orderBy(asc(order.id));
                const result = new Map<number, Order | null>();

                for (const key of keys) {
                    result.set(key, null);
                }

                for (const record of records) {
                    result.set(record.id, record);
                }

                return result;
            },
            defaultValue: () => null,
        }),
        ordersByProductId: createBatchLoader<number, Order[]>({
            batchLoad: async (keys) => {
                const records = await database
                    .select()
                    .from(order)
                    .where(inArray(order.productId, [...keys]))
                    .orderBy(asc(order.productId), asc(order.id));
                const result = new Map<number, Order[]>();

                for (const key of keys) {
                    result.set(key, []);
                }

                for (const record of records) {
                    const collection = result.get(record.productId);

                    if (collection) {
                        collection.push(record);
                    }
                }

                return result;
            },
            defaultValue: () => [],
        }),
        ordersByShopId: createBatchLoader<number, Order[]>({
            batchLoad: async (keys) => {
                const records = await database
                    .select()
                    .from(order)
                    .where(inArray(order.shopId, [...keys]))
                    .orderBy(asc(order.shopId), asc(order.id));
                const result = new Map<number, Order[]>();

                for (const key of keys) {
                    result.set(key, []);
                }

                for (const record of records) {
                    const collection = result.get(record.shopId);

                    if (collection) {
                        collection.push(record);
                    }
                }

                return result;
            },
            defaultValue: () => [],
        }),
    };
}

export type OrderLoaders = ReturnType<typeof createOrderLoaders>;

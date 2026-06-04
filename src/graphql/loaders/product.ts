import { asc, inArray } from "drizzle-orm";

import { product } from "@/db/schemas";
import { createBatchLoader } from "@shanjing/astro-full-stack-starter/graphql/loaders/batch";

import type { Database } from "@/db/client";
import type { Product } from "@/db/schemas";

export function createProductLoaders(database: Database) {
    return {
        productById: createBatchLoader<number, Product | null>({
            batchLoad: async (keys) => {
                const records = await database
                    .select()
                    .from(product)
                    .where(inArray(product.id, [...keys]))
                    .orderBy(asc(product.id));
                const result = new Map<number, Product | null>();

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
        productsByShopId: createBatchLoader<number, Product[]>({
            batchLoad: async (keys) => {
                const records = await database
                    .select()
                    .from(product)
                    .where(inArray(product.shopId, [...keys]))
                    .orderBy(asc(product.shopId), asc(product.id));
                const result = new Map<number, Product[]>();

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

export type ProductLoaders = ReturnType<typeof createProductLoaders>;

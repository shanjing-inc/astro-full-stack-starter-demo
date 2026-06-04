import { asc, inArray } from "drizzle-orm";

import { shop } from "@/db/schemas";
import { createBatchLoader } from "@shanjing/astro-full-stack-starter/graphql/loaders/batch";

import type { Database } from "@/db/client";
import type { Shop } from "@/db/schemas";

export function createShopLoaders(database: Database) {
    return {
        shopById: createBatchLoader<number, Shop | null>({
            batchLoad: async (keys) => {
                const records = await database
                    .select()
                    .from(shop)
                    .where(inArray(shop.id, [...keys]))
                    .orderBy(asc(shop.id));
                const result = new Map<number, Shop | null>();

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
    };
}

export type ShopLoaders = ReturnType<typeof createShopLoaders>;

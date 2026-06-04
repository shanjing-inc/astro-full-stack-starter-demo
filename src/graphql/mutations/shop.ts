import { inArray } from "drizzle-orm";
import { GraphQLError } from "graphql";

import { shop } from "@/db/schemas";
import {
    buildRequiredShopWhereClause,
    buildShopRelationWhere,
    parseCreateShopSetInput,
    parseShopMutationWhereInput,
    parseUpdateShopSetInput,
} from "@/graphql/types/shop";

import type { PothosBuilder } from "@/graphql/builder";
import type { ShopTypes } from "@/graphql/types/shop";

export function registerCreateShopMutation(builder: PothosBuilder, shopTypes: ShopTypes) {
    builder.mutationField("createShop", (t) =>
        t.drizzleField({
            type: shopTypes.shopItem,
            nullable: false,
            args: {
                set: t.arg({
                    type: shopTypes.createShopSetInput,
                    required: true,
                }),
            },
            resolve: async (query, _root, args, context) => {
                const parsedSet = parseCreateShopSetInput(args.set);
                const insertedRecords = await context.db
                    .insert(shop)
                    .values(parsedSet)
                    .returning({ id: shop.id });
                const createdRecord = insertedRecords[0];

                if (!createdRecord) {
                    throw new GraphQLError("Failed to create shop.");
                }

                const record = await context.db.query.shop.findFirst({
                    ...query,
                    where: {
                        id: createdRecord.id,
                    },
                });

                if (!record) {
                    throw new GraphQLError("Created shop could not be loaded.");
                }

                return record;
            },
        })
    );
}

export function registerDeleteShopMutation(builder: PothosBuilder, shopTypes: ShopTypes) {
    builder.mutationField("deleteShop", (t) =>
        t.drizzleField({
            type: [shopTypes.shopItem],
            nullable: {
                items: false,
                list: false,
            },
            args: {
                where: t.arg({
                    type: shopTypes.shopFilters,
                    required: true,
                }),
            },
            resolve: async (query, _root, args, context) => {
                const parsedWhere = parseShopMutationWhereInput(args.where);
                const relationWhere = buildShopRelationWhere(parsedWhere);
                const whereClause = buildRequiredShopWhereClause(parsedWhere);
                const matchedRows = await context.db
                    .select({ id: shop.id })
                    .from(shop)
                    .where(whereClause);

                if (matchedRows.length === 0) {
                    return [];
                }

                const records = await context.db.query.shop.findMany({
                    ...query,
                    where: relationWhere as never,
                });

                await context.db.delete(shop).where(
                    inArray(
                        shop.id,
                        matchedRows.map((row) => row.id)
                    )
                );

                return records;
            },
        })
    );
}

export function registerUpdateShopMutation(builder: PothosBuilder, shopTypes: ShopTypes) {
    builder.mutationField("updateShop", (t) =>
        t.drizzleField({
            type: [shopTypes.shopItem],
            nullable: {
                items: false,
                list: false,
            },
            args: {
                set: t.arg({
                    type: shopTypes.updateShopSetInput,
                    required: true,
                }),
                where: t.arg({
                    type: shopTypes.shopFilters,
                    required: true,
                }),
            },
            resolve: async (query, _root, args, context) => {
                const parsedSet = parseUpdateShopSetInput(args.set);
                const parsedWhere = parseShopMutationWhereInput(args.where);
                const whereClause = buildRequiredShopWhereClause(parsedWhere);
                const matchedRows = await context.db
                    .select({ id: shop.id })
                    .from(shop)
                    .where(whereClause);

                if (matchedRows.length === 0) {
                    return [];
                }

                await context.db.update(shop).set(parsedSet).where(whereClause);

                const updatedRecords = await Promise.all(
                    matchedRows.map((row) =>
                        context.db.query.shop.findFirst({
                            ...query,
                            where: {
                                id: row.id,
                            },
                        })
                    )
                );

                return updatedRecords.filter((record) => record !== undefined);
            },
        })
    );
}

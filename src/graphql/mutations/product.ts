import { inArray } from "drizzle-orm";
import { GraphQLError } from "graphql";

import { product } from "@/db/schemas";
import {
    buildProductRelationWhere,
    buildRequiredProductWhereClause,
    parseCreateProductSetInput,
    parseProductMutationWhereInput,
    parseUpdateProductSetInput,
} from "@/graphql/types/product";

import type { PothosBuilder } from "@/graphql/builder";
import type { ProductTypes } from "@/graphql/types/product";

export function registerCreateProductMutation(builder: PothosBuilder, productTypes: ProductTypes) {
    builder.mutationField("createProduct", (t) =>
        t.drizzleField({
            type: productTypes.productItem,
            nullable: false,
            args: {
                set: t.arg({
                    type: productTypes.createProductSetInput,
                    required: true,
                }),
            },
            resolve: async (query, _root, args, context) => {
                const parsedSet = parseCreateProductSetInput(args.set);
                const insertedRecords = await context.db
                    .insert(product)
                    .values(parsedSet)
                    .returning({ id: product.id });
                const createdRecord = insertedRecords[0];

                if (!createdRecord) {
                    throw new GraphQLError("Failed to create product.");
                }

                const record = await context.db.query.product.findFirst({
                    ...query(),
                    where: {
                        id: createdRecord.id,
                    },
                });

                if (!record) {
                    throw new GraphQLError("Created product could not be loaded.");
                }

                return record;
            },
        })
    );
}

export function registerDeleteProductMutation(builder: PothosBuilder, productTypes: ProductTypes) {
    builder.mutationField("deleteProduct", (t) =>
        t.drizzleField({
            type: [productTypes.productItem],
            nullable: {
                items: false,
                list: false,
            },
            args: {
                where: t.arg({
                    type: productTypes.productFilters,
                    required: true,
                }),
            },
            resolve: async (query, _root, args, context) => {
                const parsedWhere = parseProductMutationWhereInput(args.where);
                const relationWhere = buildProductRelationWhere(parsedWhere);
                const whereClause = buildRequiredProductWhereClause(parsedWhere);
                const matchedRows = await context.db
                    .select({ id: product.id })
                    .from(product)
                    .where(whereClause);

                if (matchedRows.length === 0) {
                    return [];
                }

                const records = await context.db.query.product.findMany({
                    ...query(),
                    where: relationWhere as never,
                });

                await context.db.delete(product).where(
                    inArray(
                        product.id,
                        matchedRows.map((row) => row.id)
                    )
                );

                return records;
            },
        })
    );
}

export function registerUpdateProductMutation(builder: PothosBuilder, productTypes: ProductTypes) {
    builder.mutationField("updateProduct", (t) =>
        t.drizzleField({
            type: [productTypes.productItem],
            nullable: {
                items: false,
                list: false,
            },
            args: {
                set: t.arg({
                    type: productTypes.updateProductSetInput,
                    required: true,
                }),
                where: t.arg({
                    type: productTypes.productFilters,
                    required: true,
                }),
            },
            resolve: async (query, _root, args, context) => {
                const parsedSet = parseUpdateProductSetInput(args.set);
                const parsedWhere = parseProductMutationWhereInput(args.where);
                const whereClause = buildRequiredProductWhereClause(parsedWhere);
                const matchedRows = await context.db
                    .select({ id: product.id })
                    .from(product)
                    .where(whereClause);

                if (matchedRows.length === 0) {
                    return [];
                }

                await context.db.update(product).set(parsedSet).where(whereClause);

                const updatedRecords = await Promise.all(
                    matchedRows.map((row) =>
                        context.db.query.product.findFirst({
                            ...query(),
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

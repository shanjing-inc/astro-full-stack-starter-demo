import { z } from "zod";
import { and, count, inArray } from "drizzle-orm";
import { GraphQLError } from "graphql";

import { order, product, productStatusEnum } from "@/db/schemas";
import {
    buildIntFilterConditions,
    buildRelationIntFilters,
    buildRelationStringFilters,
    buildStringFilterConditions,
} from "@shanjing/astro-full-stack-starter/graphql/helpers/filters";
import { buildOrderByObject } from "@shanjing/astro-full-stack-starter/graphql/helpers/order";
import {
    intFiltersSchema,
    innerOrderSchema,
    limitArgSchema,
    offsetArgSchema,
    stringFiltersSchema,
} from "@shanjing/astro-full-stack-starter/graphql/types/common";

import type { PothosBuilder } from "@/graphql/builder";
import type { GraphQLContext } from "@/graphql/context";
import type { Product } from "@/db/schemas";
import type {
    CommonTypes,
    InnerOrderInputShape,
    IntFiltersInputShape,
    StringFiltersInputShape,
} from "@shanjing/astro-full-stack-starter/graphql/types/common";

const productFiltersSchema = z.object({
    id: intFiltersSchema.optional(),
    shopId: intFiltersSchema.optional(),
    sku: stringFiltersSchema.optional(),
    status: stringFiltersSchema.optional(),
});
const productOrderBySchema = z
    .object({
        createdAt: innerOrderSchema.optional(),
        id: innerOrderSchema.optional(),
        inventoryCount: innerOrderSchema.optional(),
        name: innerOrderSchema.optional(),
        priceInCents: innerOrderSchema.optional(),
        shopId: innerOrderSchema.optional(),
        sku: innerOrderSchema.optional(),
        status: innerOrderSchema.optional(),
        updatedAt: innerOrderSchema.optional(),
    })
    .superRefine((value, context) => {
        const entries = Object.entries(value).filter((entry) => entry[1] !== undefined);

        if (entries.length === 0) {
            context.addIssue({
                code: "custom",
                message: "ProductOrderBy requires at least one field.",
            });
        }
    });
const productRequiredFiltersSchema = productFiltersSchema.refine(
    (value) => Object.values(value).some((entry) => entry !== undefined),
    {
        message: "ProductFilters requires at least one field.",
    }
);
const createProductSetSchema = z.object({
    shopId: z.number().int(),
    name: z.string().min(1),
    sku: z.string().min(1),
    priceInCents: z.number().int().min(0),
    inventoryCount: z.number().int().min(0).optional(),
    status: z.enum(productStatusEnum).optional(),
});
const updateProductSetSchema = z
    .object({
        shopId: z.number().int().optional(),
        name: z.string().min(1).optional(),
        sku: z.string().min(1).optional(),
        priceInCents: z.number().int().min(0).optional(),
        inventoryCount: z.number().int().min(0).optional(),
        status: z.enum(productStatusEnum).optional(),
    })
    .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
        message: "UpdateProductSetInput requires at least one field.",
    });

type ProductFiltersShape = {
    id?: IntFiltersInputShape;
    shopId?: IntFiltersInputShape;
    sku?: StringFiltersInputShape;
    status?: StringFiltersInputShape;
};

type ProductOrderByShape = {
    createdAt?: InnerOrderInputShape;
    id?: InnerOrderInputShape;
    inventoryCount?: InnerOrderInputShape;
    name?: InnerOrderInputShape;
    priceInCents?: InnerOrderInputShape;
    shopId?: InnerOrderInputShape;
    sku?: InnerOrderInputShape;
    status?: InnerOrderInputShape;
    updatedAt?: InnerOrderInputShape;
};

type CreateProductSetInputShape = {
    inventoryCount?: number | null;
    name: string;
    priceInCents: number;
    shopId: number;
    sku: string;
    status?: string | null;
};

type UpdateProductSetInputShape = {
    inventoryCount?: number | null;
    name?: string | null;
    priceInCents?: number | null;
    shopId?: number | null;
    sku?: string | null;
    status?: string | null;
};

export function registerProductTypes(builder: PothosBuilder, commonTypes: CommonTypes) {
    const productFilters = builder.inputRef<ProductFiltersShape>("ProductFilters").implement({
        fields: (t) => ({
            id: t.field({
                type: commonTypes.intFilters,
            }),
            shopId: t.field({
                type: commonTypes.intFilters,
            }),
            sku: t.field({
                type: commonTypes.stringFilters,
            }),
            status: t.field({
                type: commonTypes.stringFilters,
            }),
        }),
    });

    const productOrderBy = builder.inputRef<ProductOrderByShape>("ProductOrderBy").implement({
        fields: (t) => ({
            createdAt: t.field({
                type: commonTypes.innerOrder,
            }),
            id: t.field({
                type: commonTypes.innerOrder,
            }),
            inventoryCount: t.field({
                type: commonTypes.innerOrder,
            }),
            name: t.field({
                type: commonTypes.innerOrder,
            }),
            priceInCents: t.field({
                type: commonTypes.innerOrder,
            }),
            shopId: t.field({
                type: commonTypes.innerOrder,
            }),
            sku: t.field({
                type: commonTypes.innerOrder,
            }),
            status: t.field({
                type: commonTypes.innerOrder,
            }),
            updatedAt: t.field({
                type: commonTypes.innerOrder,
            }),
        }),
    });

    const createProductSetInput = builder
        .inputRef<CreateProductSetInputShape>("CreateProductSetInput")
        .implement({
            fields: (t) => ({
                shopId: t.int({
                    required: true,
                }),
                name: t.string({
                    required: true,
                }),
                sku: t.string({
                    required: true,
                }),
                priceInCents: t.int({
                    required: true,
                }),
                inventoryCount: t.int(),
                status: t.string(),
            }),
        });

    const updateProductSetInput = builder
        .inputRef<UpdateProductSetInputShape>("UpdateProductSetInput")
        .implement({
            fields: (t) => ({
                shopId: t.int(),
                name: t.string(),
                sku: t.string(),
                priceInCents: t.int(),
                inventoryCount: t.int(),
                status: t.string(),
            }),
        });

    const productItem = builder.drizzleObject<[], "product", { columns: { id: true } }, Product>(
        "product",
        {
            name: "ProductItem",
            select: {
                columns: {
                    id: true,
                },
            },
            fields: (t) => ({
                id: t.exposeID("id"),
                shopId: t.exposeInt("shopId"),
                name: t.exposeString("name"),
                sku: t.exposeString("sku"),
                priceInCents: t.exposeInt("priceInCents"),
                inventoryCount: t.exposeInt("inventoryCount"),
                status: t.exposeString("status"),
                createdAt: t.expose("createdAt", {
                    type: commonTypes.dateTime,
                }),
                updatedAt: t.expose("updatedAt", {
                    type: commonTypes.dateTime,
                }),
                orderCount: t.loadable({
                    type: "Int",
                    nullable: false,
                    load: async (productIds: readonly number[], context: GraphQLContext) => {
                        if (productIds.length === 0) {
                            return [];
                        }

                        const rows = await context.db
                            .select({
                                orderCount: count(order.id),
                                productId: order.productId,
                            })
                            .from(order)
                            .where(inArray(order.productId, [...productIds]))
                            .groupBy(order.productId);
                        const countsByProductId = new Map(
                            rows.map((row) => [row.productId, Number(row.orderCount)] as const)
                        );

                        return productIds.map((productId) => countsByProductId.get(productId) ?? 0);
                    },
                    resolve: (productRecord) => productRecord.id,
                }),
                shop: t.relation("shop"),
                orders: t.relation("orders"),
            }),
        }
    );

    return {
        createProductSetInput,
        productFilters,
        productItem,
        productOrderBy,
        updateProductSetInput,
    };
}

export type ProductTypes = ReturnType<typeof registerProductTypes>;

export function parseProductWhereInput(where: unknown) {
    return productFiltersSchema.parse(where ?? {});
}

export function parseProductRequiredWhereInput(where: unknown) {
    return productRequiredFiltersSchema.parse(where ?? {});
}

export function parseProductMutationWhereInput(where: unknown) {
    return parseProductRequiredWhereInput(where);
}

export function parseProductOrderByInput(orderBy: unknown) {
    if (orderBy === undefined || orderBy === null) {
        return undefined;
    }

    return productOrderBySchema.parse(orderBy) as ProductOrderByShape;
}

export function parseProductLimit(limit: unknown) {
    return limitArgSchema.parse(limit);
}

export function parseProductOffset(offset: unknown) {
    return offsetArgSchema.parse(offset);
}

export function parseProductListArgs(args: {
    limit?: unknown;
    offset?: unknown;
    orderBy?: unknown;
    where?: unknown;
}) {
    return {
        limit: parseProductLimit(args.limit),
        offset: parseProductOffset(args.offset),
        orderBy: parseProductOrderByInput(args.orderBy),
        where: parseProductWhereInput(args.where),
    };
}

export function parseCreateProductSetInput(set: unknown) {
    return createProductSetSchema.parse(set);
}

export function parseUpdateProductSetInput(set: unknown) {
    return updateProductSetSchema.parse(set);
}

export function buildProductOrderBy(orderBy: ReturnType<typeof parseProductOrderByInput>) {
    return buildOrderByObject(orderBy, "id");
}

export function buildProductWhereClause(where: ReturnType<typeof parseProductWhereInput>) {
    const conditions = [
        ...buildIntFilterConditions(product.id, where.id),
        ...buildIntFilterConditions(product.shopId, where.shopId),
        ...buildStringFilterConditions(product.sku, where.sku),
        ...buildStringFilterConditions(product.status, where.status),
    ];

    if (conditions.length === 0) {
        return undefined;
    }

    return conditions.length === 1 ? conditions[0] : and(...conditions);
}

export function buildProductRelationWhere(where: ReturnType<typeof parseProductWhereInput>) {
    const relationWhere: Record<string, unknown> = {};
    const idFilters = buildRelationIntFilters(where.id);
    const shopIdFilters = buildRelationIntFilters(where.shopId);
    const skuFilters = buildRelationStringFilters(where.sku);
    const statusFilters = buildRelationStringFilters(where.status);

    if (idFilters) {
        relationWhere.id = idFilters;
    }

    if (shopIdFilters) {
        relationWhere.shopId = shopIdFilters;
    }

    if (skuFilters) {
        relationWhere.sku = skuFilters;
    }

    if (statusFilters) {
        relationWhere.status = statusFilters;
    }

    return relationWhere;
}

export function buildRequiredProductWhereClause(
    where: ReturnType<typeof parseProductRequiredWhereInput>
) {
    const whereClause = buildProductWhereClause(where);

    if (!whereClause) {
        throw new GraphQLError("Product filters require at least one where condition.");
    }

    return whereClause;
}

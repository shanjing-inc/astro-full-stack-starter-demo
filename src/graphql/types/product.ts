import { z } from "zod";
import { and } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";

import { product } from "@/db/schemas";
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
} from "@/graphql/types/common";
import { serializeDateTime } from "@shanjing/astro-full-stack-starter/graphql/utils";

import type { PothosBuilder } from "@/graphql/builder";
import type { Product } from "@/db/schemas";
import type {
    CommonTypes,
    InnerOrderInputShape,
    IntFiltersInputShape,
    StringFiltersInputShape,
} from "@/graphql/types/common";

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
const createProductSetSchema = createInsertSchema(product).pick({
    shopId: true,
    name: true,
    sku: true,
    priceInCents: true,
    inventoryCount: true,
    status: true,
});
const updateProductSetSchema = createUpdateSchema(product)
    .pick({
        shopId: true,
        name: true,
        sku: true,
        priceInCents: true,
        inventoryCount: true,
        status: true,
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

    const productItem = builder.drizzleObject<[], "product", true, Product>("product", {
        name: "ProductItem",
        fields: (t) => ({
            id: t.exposeID("id"),
            shopId: t.exposeInt("shopId"),
            name: t.exposeString("name"),
            sku: t.exposeString("sku"),
            priceInCents: t.exposeInt("priceInCents"),
            inventoryCount: t.exposeInt("inventoryCount"),
            status: t.exposeString("status"),
            createdAt: t.field({
                type: "String",
                resolve: (productRecord) => serializeDateTime(productRecord.createdAt),
            }),
            updatedAt: t.field({
                type: "String",
                resolve: (productRecord) => serializeDateTime(productRecord.updatedAt),
            }),
            shop: t.relation("shop"),
            orders: t.relation("orders"),
        }),
    });

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
        throw new Error("Product filters require at least one where condition.");
    }

    return whereClause;
}

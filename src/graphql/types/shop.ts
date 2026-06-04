import { z } from "zod";
import { and } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";

import { shop } from "@/db/schemas";
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
import type { Shop } from "@/db/schemas";
import type {
    CommonTypes,
    InnerOrderInputShape,
    IntFiltersInputShape,
    StringFiltersInputShape,
} from "@/graphql/types/common";

const shopFiltersSchema = z.object({
    id: intFiltersSchema.optional(),
    slug: stringFiltersSchema.optional(),
    status: stringFiltersSchema.optional(),
});
const shopOrderBySchema = z
    .object({
        createdAt: innerOrderSchema.optional(),
        id: innerOrderSchema.optional(),
        name: innerOrderSchema.optional(),
        slug: innerOrderSchema.optional(),
        status: innerOrderSchema.optional(),
        updatedAt: innerOrderSchema.optional(),
    })
    .superRefine((value, context) => {
        const entries = Object.entries(value).filter((entry) => entry[1] !== undefined);

        if (entries.length === 0) {
            context.addIssue({
                code: "custom",
                message: "ShopOrderBy requires at least one field.",
            });
        }
    });
const shopRequiredFiltersSchema = shopFiltersSchema.refine(
    (value) => Object.values(value).some((entry) => entry !== undefined),
    {
        message: "ShopFilters requires at least one field.",
    }
);
const createShopSetSchema = createInsertSchema(shop).pick({
    name: true,
    slug: true,
    status: true,
});
const updateShopSetSchema = createUpdateSchema(shop)
    .pick({
        name: true,
        slug: true,
        status: true,
    })
    .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
        message: "UpdateShopSetInput requires at least one field.",
    });

type ShopFiltersShape = {
    id?: IntFiltersInputShape;
    slug?: StringFiltersInputShape;
    status?: StringFiltersInputShape;
};

type ShopOrderByShape = {
    createdAt?: InnerOrderInputShape;
    id?: InnerOrderInputShape;
    name?: InnerOrderInputShape;
    slug?: InnerOrderInputShape;
    status?: InnerOrderInputShape;
    updatedAt?: InnerOrderInputShape;
};

type CreateShopSetInputShape = {
    name: string;
    slug: string;
    status?: string | null;
};

type UpdateShopSetInputShape = {
    name?: string | null;
    slug?: string | null;
    status?: string | null;
};

export function registerShopTypes(builder: PothosBuilder, commonTypes: CommonTypes) {
    const shopFilters = builder.inputRef<ShopFiltersShape>("ShopFilters").implement({
        fields: (t) => ({
            id: t.field({
                type: commonTypes.intFilters,
            }),
            slug: t.field({
                type: commonTypes.stringFilters,
            }),
            status: t.field({
                type: commonTypes.stringFilters,
            }),
        }),
    });

    const shopOrderBy = builder.inputRef<ShopOrderByShape>("ShopOrderBy").implement({
        fields: (t) => ({
            createdAt: t.field({
                type: commonTypes.innerOrder,
            }),
            id: t.field({
                type: commonTypes.innerOrder,
            }),
            name: t.field({
                type: commonTypes.innerOrder,
            }),
            slug: t.field({
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

    const createShopSetInput = builder
        .inputRef<CreateShopSetInputShape>("CreateShopSetInput")
        .implement({
            fields: (t) => ({
                name: t.string({
                    required: true,
                }),
                slug: t.string({
                    required: true,
                }),
                status: t.string(),
            }),
        });

    const updateShopSetInput = builder
        .inputRef<UpdateShopSetInputShape>("UpdateShopSetInput")
        .implement({
            fields: (t) => ({
                name: t.string(),
                slug: t.string(),
                status: t.string(),
            }),
        });

    const shopItem = builder.drizzleObject<[], "shop", true, Shop>("shop", {
        name: "ShopItem",
        fields: (t) => ({
            id: t.exposeID("id"),
            name: t.exposeString("name"),
            slug: t.exposeString("slug"),
            status: t.exposeString("status"),
            createdAt: t.field({
                type: "String",
                resolve: (shopRecord) => serializeDateTime(shopRecord.createdAt),
            }),
            updatedAt: t.field({
                type: "String",
                resolve: (shopRecord) => serializeDateTime(shopRecord.updatedAt),
            }),
            products: t.relation("products"),
            orders: t.relation("orders"),
        }),
    });

    return {
        createShopSetInput,
        shopFilters,
        shopItem,
        shopOrderBy,
        updateShopSetInput,
    };
}

export type ShopTypes = ReturnType<typeof registerShopTypes>;

export function parseShopWhereInput(where: unknown) {
    return shopFiltersSchema.parse(where ?? {});
}

export function parseShopRequiredWhereInput(where: unknown) {
    return shopRequiredFiltersSchema.parse(where ?? {});
}

export function parseShopOrderByInput(orderBy: unknown) {
    if (orderBy === undefined || orderBy === null) {
        return undefined;
    }

    return shopOrderBySchema.parse(orderBy) as ShopOrderByShape;
}

export function parseShopLimit(limit: unknown) {
    return limitArgSchema.parse(limit);
}

export function parseShopMutationWhereInput(where: unknown) {
    return parseShopRequiredWhereInput(where);
}

export function parseShopOffset(offset: unknown) {
    return offsetArgSchema.parse(offset);
}

export function buildShopOrderBy(orderBy: ReturnType<typeof parseShopOrderByInput>) {
    return buildOrderByObject(orderBy, "id");
}

export function buildShopWhereClause(where: ReturnType<typeof parseShopWhereInput>) {
    const conditions = [
        ...buildIntFilterConditions(shop.id, where.id),
        ...buildStringFilterConditions(shop.slug, where.slug),
        ...buildStringFilterConditions(shop.status, where.status),
    ];

    if (conditions.length === 0) {
        return undefined;
    }

    return conditions.length === 1 ? conditions[0] : and(...conditions);
}

export function buildShopRelationWhere(where: ReturnType<typeof parseShopWhereInput>) {
    const relationWhere: Record<string, unknown> = {};
    const idFilters = buildRelationIntFilters(where.id);
    const slugFilters = buildRelationStringFilters(where.slug);
    const statusFilters = buildRelationStringFilters(where.status);

    if (idFilters) {
        relationWhere.id = idFilters;
    }

    if (slugFilters) {
        relationWhere.slug = slugFilters;
    }

    if (statusFilters) {
        relationWhere.status = statusFilters;
    }

    return relationWhere;
}

export function buildRequiredShopWhereClause(
    where: ReturnType<typeof parseShopRequiredWhereInput>
) {
    const whereClause = buildShopWhereClause(where);

    if (!whereClause) {
        throw new Error("Shop filters require at least one where condition.");
    }

    return whereClause;
}

export function parseShopListArgs(args: {
    limit?: unknown;
    offset?: unknown;
    orderBy?: unknown;
    where?: unknown;
}) {
    return {
        limit: parseShopLimit(args.limit),
        offset: parseShopOffset(args.offset),
        orderBy: parseShopOrderByInput(args.orderBy),
        where: parseShopWhereInput(args.where),
    };
}

export function parseCreateShopSetInput(set: unknown) {
    return createShopSetSchema.parse(set);
}

export function parseUpdateShopSetInput(set: unknown) {
    return updateShopSetSchema.parse(set);
}

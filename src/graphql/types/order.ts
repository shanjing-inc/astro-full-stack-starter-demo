import { z } from "zod";
import { and } from "drizzle-orm";
import { GraphQLError } from "graphql";

import { order, orderStatusEnum } from "@/db/schemas";
import {
    buildDateTimeFilterConditions,
    buildIntFilterConditions,
    buildRelationDateTimeFilters,
    buildRelationIntFilters,
    buildRelationStringFilters,
    buildStringFilterConditions,
} from "@shanjing/astro-full-stack-starter/graphql/helpers/filters";
import { buildOrderByObject } from "@shanjing/astro-full-stack-starter/graphql/helpers/order";
import {
    dateTimeFiltersSchema,
    intFiltersSchema,
    innerOrderSchema,
    limitArgSchema,
    offsetArgSchema,
    stringFiltersSchema,
} from "@shanjing/astro-full-stack-starter/graphql/types/common";

import type { PothosBuilder } from "@/graphql/builder";
import type { Order } from "@/db/schemas";
import type {
    CommonTypes,
    DateTimeFiltersInputShape,
    InnerOrderInputShape,
    IntFiltersInputShape,
    StringFiltersInputShape,
} from "@shanjing/astro-full-stack-starter/graphql/types/common";

const orderFiltersSchema = z.object({
    id: intFiltersSchema.optional(),
    orderNo: stringFiltersSchema.optional(),
    productId: intFiltersSchema.optional(),
    shopId: intFiltersSchema.optional(),
    status: stringFiltersSchema.optional(),
    createdAt: dateTimeFiltersSchema.optional(),
});
const orderOrderBySchema = z
    .object({
        createdAt: innerOrderSchema.optional(),
        id: innerOrderSchema.optional(),
        orderNo: innerOrderSchema.optional(),
        productId: innerOrderSchema.optional(),
        quantity: innerOrderSchema.optional(),
        shopId: innerOrderSchema.optional(),
        status: innerOrderSchema.optional(),
        totalAmountInCents: innerOrderSchema.optional(),
        unitPriceInCents: innerOrderSchema.optional(),
        updatedAt: innerOrderSchema.optional(),
    })
    .superRefine((value, context) => {
        const entries = Object.entries(value).filter((entry) => entry[1] !== undefined);

        if (entries.length === 0) {
            context.addIssue({
                code: "custom",
                message: "OrderOrderBy requires at least one field.",
            });
        }
    });
const orderRequiredFiltersSchema = orderFiltersSchema.refine(
    (value) => Object.values(value).some((entry) => entry !== undefined),
    {
        message: "OrderFilters requires at least one field.",
    }
);
const createOrderSetSchema = z.object({
    shopId: z.number().int(),
    productId: z.number().int(),
    orderNo: z.string().min(1),
    quantity: z.number().int().min(1).optional(),
    unitPriceInCents: z.number().int().min(0),
    totalAmountInCents: z.number().int().min(0),
    status: z.enum(orderStatusEnum).optional(),
    remark: z.string().optional().nullable(),
});
const updateOrderSetSchema = z
    .object({
        shopId: z.number().int().optional(),
        productId: z.number().int().optional(),
        orderNo: z.string().min(1).optional(),
        quantity: z.number().int().min(1).optional(),
        unitPriceInCents: z.number().int().min(0).optional(),
        totalAmountInCents: z.number().int().min(0).optional(),
        status: z.enum(orderStatusEnum).optional(),
        remark: z.string().optional().nullable(),
    })
    .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
        message: "UpdateOrderSetInput requires at least one field.",
    });

type OrderFiltersShape = {
    id?: IntFiltersInputShape;
    orderNo?: StringFiltersInputShape;
    productId?: IntFiltersInputShape;
    shopId?: IntFiltersInputShape;
    status?: StringFiltersInputShape;
    createdAt?: DateTimeFiltersInputShape;
};

type OrderOrderByShape = {
    createdAt?: InnerOrderInputShape;
    id?: InnerOrderInputShape;
    orderNo?: InnerOrderInputShape;
    productId?: InnerOrderInputShape;
    quantity?: InnerOrderInputShape;
    shopId?: InnerOrderInputShape;
    status?: InnerOrderInputShape;
    totalAmountInCents?: InnerOrderInputShape;
    unitPriceInCents?: InnerOrderInputShape;
    updatedAt?: InnerOrderInputShape;
};

type CreateOrderSetInputShape = {
    orderNo: string;
    productId: number;
    quantity?: number | null;
    remark?: string | null;
    shopId: number;
    status?: string | null;
    totalAmountInCents: number;
    unitPriceInCents: number;
};

type UpdateOrderSetInputShape = {
    orderNo?: string | null;
    productId?: number | null;
    quantity?: number | null;
    remark?: string | null;
    shopId?: number | null;
    status?: string | null;
    totalAmountInCents?: number | null;
    unitPriceInCents?: number | null;
};

export function registerOrderTypes(builder: PothosBuilder, commonTypes: CommonTypes) {
    const orderFilters = builder.inputRef<OrderFiltersShape>("OrderFilters").implement({
        fields: (t) => ({
            id: t.field({
                type: commonTypes.intFilters,
            }),
            shopId: t.field({
                type: commonTypes.intFilters,
            }),
            productId: t.field({
                type: commonTypes.intFilters,
            }),
            orderNo: t.field({
                type: commonTypes.stringFilters,
            }),
            status: t.field({
                type: commonTypes.stringFilters,
            }),
            createdAt: t.field({
                type: commonTypes.dateTimeFilters,
            }),
        }),
    });

    const orderOrderBy = builder.inputRef<OrderOrderByShape>("OrderOrderBy").implement({
        fields: (t) => ({
            createdAt: t.field({
                type: commonTypes.innerOrder,
            }),
            id: t.field({
                type: commonTypes.innerOrder,
            }),
            orderNo: t.field({
                type: commonTypes.innerOrder,
            }),
            productId: t.field({
                type: commonTypes.innerOrder,
            }),
            quantity: t.field({
                type: commonTypes.innerOrder,
            }),
            shopId: t.field({
                type: commonTypes.innerOrder,
            }),
            status: t.field({
                type: commonTypes.innerOrder,
            }),
            totalAmountInCents: t.field({
                type: commonTypes.innerOrder,
            }),
            unitPriceInCents: t.field({
                type: commonTypes.innerOrder,
            }),
            updatedAt: t.field({
                type: commonTypes.innerOrder,
            }),
        }),
    });

    const createOrderSetInput = builder
        .inputRef<CreateOrderSetInputShape>("CreateOrderSetInput")
        .implement({
            fields: (t) => ({
                shopId: t.int({
                    required: true,
                }),
                productId: t.int({
                    required: true,
                }),
                orderNo: t.string({
                    required: true,
                }),
                quantity: t.int(),
                unitPriceInCents: t.int({
                    required: true,
                }),
                totalAmountInCents: t.int({
                    required: true,
                }),
                status: t.string(),
                remark: t.string(),
            }),
        });

    const updateOrderSetInput = builder
        .inputRef<UpdateOrderSetInputShape>("UpdateOrderSetInput")
        .implement({
            fields: (t) => ({
                shopId: t.int(),
                productId: t.int(),
                orderNo: t.string(),
                quantity: t.int(),
                unitPriceInCents: t.int(),
                totalAmountInCents: t.int(),
                status: t.string(),
                remark: t.string(),
            }),
        });

    const orderItem = builder.drizzleObject<[], "order", true, Order>("order", {
        name: "OrderItem",
        fields: (t) => ({
            id: t.exposeID("id"),
            shopId: t.exposeInt("shopId"),
            productId: t.exposeInt("productId"),
            orderNo: t.exposeString("orderNo"),
            quantity: t.exposeInt("quantity"),
            unitPriceInCents: t.exposeInt("unitPriceInCents"),
            totalAmountInCents: t.exposeInt("totalAmountInCents"),
            status: t.exposeString("status"),
            remark: t.exposeString("remark", {
                nullable: true,
            }),
            createdAt: t.expose("createdAt", {
                type: commonTypes.dateTime,
            }),
            updatedAt: t.expose("updatedAt", {
                type: commonTypes.dateTime,
            }),
            shop: t.relation("shop"),
            product: t.relation("product"),
        }),
    });

    return {
        createOrderSetInput,
        orderFilters,
        orderItem,
        orderOrderBy,
        updateOrderSetInput,
    };
}

export type OrderTypes = ReturnType<typeof registerOrderTypes>;

export function parseOrderWhereInput(where: unknown) {
    return orderFiltersSchema.parse(where ?? {});
}

export function parseOrderRequiredWhereInput(where: unknown) {
    return orderRequiredFiltersSchema.parse(where ?? {});
}

export function parseOrderMutationWhereInput(where: unknown) {
    return parseOrderRequiredWhereInput(where);
}

export function parseOrderOrderByInput(orderBy: unknown) {
    if (orderBy === undefined || orderBy === null) {
        return undefined;
    }

    return orderOrderBySchema.parse(orderBy) as OrderOrderByShape;
}

export function parseOrderLimit(limit: unknown) {
    return limitArgSchema.parse(limit);
}

export function parseOrderOffset(offset: unknown) {
    return offsetArgSchema.parse(offset);
}

export function parseOrderListArgs(args: {
    limit?: unknown;
    offset?: unknown;
    orderBy?: unknown;
    where?: unknown;
}) {
    return {
        limit: parseOrderLimit(args.limit),
        offset: parseOrderOffset(args.offset),
        orderBy: parseOrderOrderByInput(args.orderBy),
        where: parseOrderWhereInput(args.where),
    };
}

export function parseCreateOrderSetInput(set: unknown) {
    return createOrderSetSchema.parse(set);
}

export function parseUpdateOrderSetInput(set: unknown) {
    return updateOrderSetSchema.parse(set);
}

export function buildOrderOrderBy(orderBy: ReturnType<typeof parseOrderOrderByInput>) {
    return buildOrderByObject(orderBy, "id");
}

export function buildOrderWhereClause(where: ReturnType<typeof parseOrderWhereInput>) {
    const conditions = [
        ...buildIntFilterConditions(order.id, where.id),
        ...buildIntFilterConditions(order.shopId, where.shopId),
        ...buildIntFilterConditions(order.productId, where.productId),
        ...buildStringFilterConditions(order.orderNo, where.orderNo),
        ...buildStringFilterConditions(order.status, where.status),
        ...buildDateTimeFilterConditions(order.createdAt, where.createdAt),
    ];

    if (conditions.length === 0) {
        return undefined;
    }

    return conditions.length === 1 ? conditions[0] : and(...conditions);
}

export function buildOrderRelationWhere(where: ReturnType<typeof parseOrderWhereInput>) {
    const relationWhere: Record<string, unknown> = {};
    const idFilters = buildRelationIntFilters(where.id);
    const shopIdFilters = buildRelationIntFilters(where.shopId);
    const productIdFilters = buildRelationIntFilters(where.productId);
    const orderNoFilters = buildRelationStringFilters(where.orderNo);
    const statusFilters = buildRelationStringFilters(where.status);
    const createdAtFilters = buildRelationDateTimeFilters(where.createdAt);

    if (idFilters) {
        relationWhere.id = idFilters;
    }

    if (shopIdFilters) {
        relationWhere.shopId = shopIdFilters;
    }

    if (productIdFilters) {
        relationWhere.productId = productIdFilters;
    }

    if (orderNoFilters) {
        relationWhere.orderNo = orderNoFilters;
    }

    if (statusFilters) {
        relationWhere.status = statusFilters;
    }

    if (createdAtFilters) {
        relationWhere.createdAt = createdAtFilters;
    }

    return relationWhere;
}

export function buildRequiredOrderWhereClause(
    where: ReturnType<typeof parseOrderRequiredWhereInput>
) {
    const whereClause = buildOrderWhereClause(where);

    if (!whereClause) {
        throw new GraphQLError("Order filters require at least one where condition.");
    }

    return whereClause;
}

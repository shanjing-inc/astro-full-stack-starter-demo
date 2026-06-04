import { z } from "zod";
import { Kind, type ValueNode } from "graphql";

import type { JsonValue, PothosBuilder } from "@/graphql/builder";

export type { JsonValue } from "@/graphql/builder";

const orderDirectionValues = ["asc", "desc"] as const;
const normalizeOptionalValue = (value: unknown) => value ?? undefined;

export const limitArgSchema = z.preprocess(
    normalizeOptionalValue,
    z.number().int().min(1).max(100).optional().default(20)
);
export const offsetArgSchema = z.preprocess(
    normalizeOptionalValue,
    z.number().int().min(0).optional().default(0)
);

export const innerOrderSchema = z.object({
    direction: z.enum(orderDirectionValues),
    priority: z.number().int(),
});
export const intFiltersSchema = z
    .object({
        eq: z.number().int().optional(),
        gt: z.number().int().optional(),
        gte: z.number().int().optional(),
        inArray: z.array(z.number().int()).min(1).optional(),
        isNotNull: z.boolean().optional(),
        isNull: z.boolean().optional(),
        lt: z.number().int().optional(),
        lte: z.number().int().optional(),
        ne: z.number().int().optional(),
        notInArray: z.array(z.number().int()).min(1).optional(),
    })
    .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
        message: "IntFilters requires at least one field.",
    });
export const stringFiltersSchema = z
    .object({
        eq: z.string().optional(),
        gt: z.string().optional(),
        gte: z.string().optional(),
        ilike: z.string().optional(),
        inArray: z.array(z.string()).min(1).optional(),
        isNotNull: z.boolean().optional(),
        isNull: z.boolean().optional(),
        like: z.string().optional(),
        lt: z.string().optional(),
        lte: z.string().optional(),
        ne: z.string().optional(),
        notIlike: z.string().optional(),
        notInArray: z.array(z.string()).min(1).optional(),
        notLike: z.string().optional(),
    })
    .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
        message: "StringFilters requires at least one field.",
    });

export type OrderDirection = (typeof orderDirectionValues)[number];

export type InnerOrderInputShape = {
    direction: OrderDirection;
    priority: number;
};

export type IntFiltersInputShape = {
    eq?: number;
    gt?: number;
    gte?: number;
    inArray?: number[];
    isNotNull?: boolean;
    isNull?: boolean;
    lt?: number;
    lte?: number;
    ne?: number;
    notInArray?: number[];
};

export type StringFiltersInputShape = {
    eq?: string;
    gt?: string;
    gte?: string;
    ilike?: string;
    inArray?: string[];
    isNotNull?: boolean;
    isNull?: boolean;
    like?: string;
    lt?: string;
    lte?: string;
    ne?: string;
    notIlike?: string;
    notInArray?: string[];
    notLike?: string;
};

function parseJsonLiteral(valueNode: ValueNode): JsonValue {
    switch (valueNode.kind) {
        case Kind.BOOLEAN:
        case Kind.STRING:
            return valueNode.value;
        case Kind.FLOAT:
        case Kind.INT:
            return Number(valueNode.value);
        case Kind.LIST:
            return valueNode.values.map((value) => parseJsonLiteral(value));
        case Kind.NULL:
            return null;
        case Kind.OBJECT:
            return Object.fromEntries(
                valueNode.fields.map((field) => [field.name.value, parseJsonLiteral(field.value)])
            );
        default:
            return null;
    }
}

export function registerCommonTypes(builder: PothosBuilder) {
    const json = builder.scalarType("JSON", {
        parseLiteral: parseJsonLiteral,
        parseValue: (value) => value as JsonValue,
        serialize: (value) => value as JsonValue,
    });

    const orderDirection = builder.enumType("OrderDirection", {
        values: orderDirectionValues,
    });

    const innerOrder = builder.inputRef<InnerOrderInputShape>("InnerOrder").implement({
        fields: (t) => ({
            direction: t.field({
                type: orderDirection,
                required: true,
            }),
            priority: t.int({
                required: true,
            }),
        }),
    });

    const intFilters = builder.inputRef<IntFiltersInputShape>("IntFilters").implement({
        fields: (t) => ({
            eq: t.int(),
            gt: t.int(),
            gte: t.int(),
            inArray: t.intList(),
            isNotNull: t.boolean(),
            isNull: t.boolean(),
            lt: t.int(),
            lte: t.int(),
            ne: t.int(),
            notInArray: t.intList(),
        }),
    });

    const stringFilters = builder.inputRef<StringFiltersInputShape>("StringFilters").implement({
        fields: (t) => ({
            eq: t.string(),
            gt: t.string(),
            gte: t.string(),
            ilike: t.string(),
            inArray: t.stringList(),
            isNotNull: t.boolean(),
            isNull: t.boolean(),
            like: t.string(),
            lt: t.string(),
            lte: t.string(),
            ne: t.string(),
            notIlike: t.string(),
            notInArray: t.stringList(),
            notLike: t.string(),
        }),
    });

    return {
        innerOrder,
        intFilters,
        json,
        orderDirection,
        stringFilters,
    };
}

export type CommonTypes = ReturnType<typeof registerCommonTypes>;

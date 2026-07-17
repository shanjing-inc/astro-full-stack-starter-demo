import { describe, expect, it } from "vitest";

import {
    buildOrderRelationWhere,
    parseOrderWhereInput,
    registerOrderTypes,
} from "@/graphql/types/order";
import {
    buildShopOrderBy,
    buildShopRelationWhere,
    parseCreateShopSetInput,
    parseShopListArgs,
    parseShopOrderByInput,
    parseShopRequiredWhereInput,
    parseShopLimit,
    parseShopMutationWhereInput,
    parseShopOffset,
    parseShopWhereInput,
    parseUpdateShopSetInput,
    buildRequiredShopWhereClause,
    buildShopWhereClause,
    registerShopTypes,
} from "@/graphql/types/shop";
import {
    intFiltersSchema,
    limitArgSchema,
    offsetArgSchema,
    registerCommonTypes,
    stringFiltersSchema,
} from "@shanjing/astro-full-stack-starter/graphql/types/common";

type CommonTypesMockResult = {
    dateTime: string;
    dateTimeFilters: string;
    json: {
        parseLiteral: (value: never) => unknown;
        parseValue: (value: unknown) => unknown;
        serialize: (value: unknown) => unknown;
    };
    orderDirection: {
        values: readonly string[];
    };
};

type ShopTypesMockResult = {
    createShopSetInput: {
        fields: Record<string, unknown>;
    };
    shopFilters: {
        fields: Record<string, unknown>;
    };
    shopItem: {
        fields: {
            createdAt: {
                expose: string;
                type: string;
            };
            products: unknown;
            updatedAt: {
                expose: string;
                type: string;
            };
        };
    };
    updateShopSetInput: {
        fields: Record<string, unknown>;
    };
};

type OrderTypesMockResult = {
    orderFilters: {
        fields: Record<string, unknown>;
    };
};

describe("shop GraphQL types", () => {
    it("applies list argument defaults", () => {
        expect(parseShopListArgs({})).toEqual({
            limit: 20,
            offset: 0,
            orderBy: undefined,
            where: {},
        });
    });

    it("requires at least one field for required where inputs", () => {
        expect(() => parseShopRequiredWhereInput({})).toThrow(
            "ShopFilters requires at least one field."
        );
    });

    it("requires at least one order field", () => {
        expect(() => parseShopOrderByInput({})).toThrow("ShopOrderBy requires at least one field.");
    });

    it("parses optional list args and empty filters", () => {
        expect(parseShopOrderByInput(null)).toBeUndefined();
        expect(parseShopLimit(undefined)).toBe(20);
        expect(parseShopLimit(null)).toBe(20);
        expect(parseShopLimit(100)).toBe(100);
        expect(parseShopOffset(undefined)).toBe(0);
        expect(parseShopOffset(null)).toBe(0);
        expect(parseShopOffset(10)).toBe(10);
        expect(parseShopWhereInput(undefined)).toEqual({});
        expect(buildShopWhereClause({})).toBeUndefined();
    });

    it("builds relation filters and fallback ordering from parsed inputs", () => {
        const orderBy = parseShopOrderByInput({
            slug: {
                direction: "desc",
                priority: 1,
            },
            name: {
                direction: "asc",
                priority: 2,
            },
        });
        const relationWhere = buildShopRelationWhere({
            id: {
                eq: 1,
            },
            slug: {
                like: "%demo%",
            },
            status: {
                eq: "draft",
            },
        });

        expect(buildShopOrderBy(orderBy)).toEqual({
            slug: "desc",
            name: "asc",
            id: "desc",
        });
        expect(relationWhere).toEqual({
            id: {
                eq: 1,
            },
            slug: {
                like: "%demo%",
            },
            status: {
                eq: "draft",
            },
        });
    });

    it("builds required where clauses for mutation filters", () => {
        const where = parseShopMutationWhereInput({
            id: {
                eq: 1,
            },
        });

        expect(buildRequiredShopWhereClause(where)).toBeTruthy();
        expect(
            buildShopWhereClause({
                id: {
                    eq: 1,
                },
                slug: {
                    eq: "demo",
                },
            })
        ).toBeTruthy();
        expect(buildShopRelationWhere({})).toEqual({});
        expect(() => parseShopRequiredWhereInput(undefined)).toThrow(
            "ShopFilters requires at least one field."
        );
        expect(() => buildRequiredShopWhereClause({} as never)).toThrow(
            "Shop filters require at least one where condition."
        );
    });

    it("parses create payloads through drizzle-zod", () => {
        expect(
            parseCreateShopSetInput({
                name: "Demo Shop",
                slug: "demo-shop",
                status: "draft",
            })
        ).toEqual({
            name: "Demo Shop",
            slug: "demo-shop",
            status: "draft",
        });
    });

    it("parses update payloads through drizzle-zod and validates non-empty updates", () => {
        expect(
            parseUpdateShopSetInput({
                name: "Updated Shop",
            })
        ).toEqual({
            name: "Updated Shop",
        });
        expect(() => parseUpdateShopSetInput({})).toThrow(
            "UpdateShopSetInput requires at least one field."
        );
    });

    it("validates common schemas and registers common builder types", () => {
        expect(limitArgSchema.parse(null)).toBe(20);
        expect(offsetArgSchema.parse(null)).toBe(0);
        expect(intFiltersSchema.parse({ eq: 1 })).toEqual({ eq: 1 });
        expect(stringFiltersSchema.parse({ like: "%demo%" })).toEqual({ like: "%demo%" });
        expect(() => intFiltersSchema.parse({})).toThrow("IntFilters requires at least one field.");
        expect(() => stringFiltersSchema.parse({})).toThrow(
            "StringFilters requires at least one field."
        );

        const fieldBuilder = {
            boolean: () => "boolean",
            field: (config: unknown) => config,
            int: () => "int",
            intList: () => "intList",
            string: () => "string",
            stringList: () => "stringList",
        };
        const builder = {
            enumType: (_name: string, config: unknown) => config,
            inputRef: (name: string) => ({
                implement: ({ fields }: { fields: (t: typeof fieldBuilder) => unknown }) => ({
                    fields: fields(fieldBuilder),
                    name,
                }),
            }),
            scalarType: (_name: string, config: unknown) => config,
        };

        const commonTypes = registerCommonTypes(
            builder as never
        ) as unknown as CommonTypesMockResult;

        expect(commonTypes.orderDirection).toEqual({
            values: ["asc", "desc"],
        });
        expect(commonTypes.json.serialize({ ok: true })).toEqual({ ok: true });
        expect(commonTypes.json.parseValue(["value"])).toEqual(["value"]);
        expect(commonTypes.json.parseLiteral({ kind: "IntValue", value: "42" } as never)).toBe(42);
        expect(commonTypes.json.parseLiteral({ kind: "FloatValue", value: "4.2" } as never)).toBe(
            4.2
        );
        expect(
            commonTypes.json.parseLiteral({ kind: "EnumValue", value: "ignored" } as never)
        ).toBeNull();
        expect(
            commonTypes.json.parseLiteral({
                fields: [
                    {
                        name: {
                            value: "nested",
                        },
                        value: {
                            kind: "ListValue",
                            values: [
                                {
                                    kind: "BooleanValue",
                                    value: true,
                                },
                                {
                                    kind: "NullValue",
                                },
                            ],
                        },
                    },
                ],
                kind: "ObjectValue",
            } as never)
        ).toEqual({
            nested: [true, null],
        });
    });

    it("registers shop builder types and field resolvers", () => {
        const fieldBuilder = {
            exposeID: (name: string) => ({
                expose: "id",
                name,
            }),
            exposeString: (name: string) => ({
                expose: "string",
                name,
            }),
            expose: (name: string, config: unknown) => ({
                ...(config as Record<string, unknown>),
                expose: name,
            }),
            field: (config: unknown) => config,
            relation: (name: string) => ({
                relation: name,
            }),
            string: (config?: unknown) => config ?? "string",
        };
        const builder = {
            drizzleObject: (
                _tableName: string,
                config: { fields: (t: typeof fieldBuilder) => unknown }
            ) => ({
                fields: config.fields(fieldBuilder),
                name: "ShopItem",
            }),
            inputRef: (name: string) => ({
                implement: ({ fields }: { fields: (t: typeof fieldBuilder) => unknown }) => ({
                    fields: fields(fieldBuilder),
                    name,
                }),
            }),
        };
        const commonTypes = {
            dateTime: "DateTime",
            dateTimeFilters: "DateTimeFilters",
            innerOrder: "InnerOrder",
            intFilters: "IntFilters",
            json: "JSON",
            orderDirection: "OrderDirection",
            stringFilters: "StringFilters",
        };

        const shopTypes = registerShopTypes(
            builder as never,
            commonTypes as never
        ) as unknown as ShopTypesMockResult;

        expect(shopTypes.shopFilters.fields).toEqual({
            id: {
                type: "IntFilters",
            },
            slug: {
                type: "StringFilters",
            },
            status: {
                type: "StringFilters",
            },
        });
        expect(shopTypes.createShopSetInput.fields.name).toEqual({
            required: true,
        });
        expect(shopTypes.updateShopSetInput.fields.status).toBe("string");
        expect(shopTypes.shopItem.fields.createdAt.type).toBe("DateTime");
        expect(shopTypes.shopItem.fields.updatedAt.type).toBe("DateTime");
        expect(shopTypes.shopItem.fields.createdAt.expose).toBe("createdAt");
        expect(shopTypes.shopItem.fields.updatedAt.expose).toBe("updatedAt");
        expect(shopTypes.shopItem.fields.products).toEqual({
            relation: "products",
        });
    });

    it("supports createdAt DateTime filters for order queries", () => {
        const createdAtFilters = {
            gte: "2026-06-01T00:00:00Z",
            lt: "2026-06-09T00:00:00Z",
        };

        const parsedWhere = parseOrderWhereInput({
            createdAt: createdAtFilters,
        });

        expect(parsedWhere.createdAt?.gte).toBeInstanceOf(Date);
        expect(parsedWhere.createdAt?.lt).toBeInstanceOf(Date);
        expect(buildOrderRelationWhere(parsedWhere)).toEqual({
            createdAt: {
                gte: new Date("2026-06-01T00:00:00.000Z"),
                lt: new Date("2026-06-09T00:00:00.000Z"),
            },
        });

        const fieldBuilder = {
            expose: (name: string, config: unknown) => ({
                ...(config as Record<string, unknown>),
                expose: name,
            }),
            exposeID: (name: string) => ({
                expose: "id",
                name,
            }),
            exposeInt: (name: string) => ({
                expose: "int",
                name,
            }),
            exposeString: (name: string) => ({
                expose: "string",
                name,
            }),
            field: (config: unknown) => config,
            int: (config?: unknown) => config ?? "int",
            relation: (name: string) => ({
                relation: name,
            }),
            string: (config?: unknown) => config ?? "string",
        };
        const builder = {
            drizzleObject: (
                _tableName: string,
                config: { fields: (t: typeof fieldBuilder) => unknown }
            ) => ({
                fields: config.fields(fieldBuilder),
                name: "OrderItem",
            }),
            inputRef: (name: string) => ({
                implement: ({ fields }: { fields: (t: typeof fieldBuilder) => unknown }) => ({
                    fields: fields(fieldBuilder),
                    name,
                }),
            }),
        };
        const commonTypes = {
            dateTime: "DateTime",
            dateTimeFilters: "DateTimeFilters",
            innerOrder: "InnerOrder",
            intFilters: "IntFilters",
            json: "JSON",
            orderDirection: "OrderDirection",
            stringFilters: "StringFilters",
        };

        const orderTypes = registerOrderTypes(
            builder as never,
            commonTypes as never
        ) as unknown as OrderTypesMockResult;

        expect(orderTypes.orderFilters.fields.createdAt).toEqual({
            type: "DateTimeFilters",
        });
    });
});

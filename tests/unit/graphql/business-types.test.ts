import { describe, expect, it } from "vitest";

import {
    buildOrderRelationWhere,
    buildRequiredOrderWhereClause,
    parseCreateOrderSetInput,
    parseOrderListArgs,
    parseOrderRequiredWhereInput,
    parseOrderWhereInput,
    parseUpdateOrderSetInput,
} from "@/graphql/types/order";
import {
    parseCreateProductSetInput,
    parseProductListArgs,
    parseUpdateProductSetInput,
} from "@/graphql/types/product";
import {
    buildRequiredShopWhereClause,
    parseCreateShopSetInput,
    parseShopListArgs,
    parseShopRequiredWhereInput,
    parseUpdateShopSetInput,
} from "@/graphql/types/shop";

describe("Cloudflare D1 business GraphQL types", () => {
    it("applies list argument defaults for business queries", () => {
        expect(parseShopListArgs({})).toEqual({
            limit: 20,
            offset: 0,
            orderBy: undefined,
            where: {},
        });
        expect(parseProductListArgs({})).toMatchObject({
            limit: 20,
            offset: 0,
            where: {},
        });
        expect(parseOrderListArgs({})).toMatchObject({
            limit: 20,
            offset: 0,
            where: {},
        });
    });

    it("validates shop create and update payloads", () => {
        expect(
            parseCreateShopSetInput({
                name: "Cloudflare Shop",
                slug: "cloudflare-shop",
            })
        ).toEqual({
            name: "Cloudflare Shop",
            slug: "cloudflare-shop",
        });
        expect(parseUpdateShopSetInput({ status: "active" })).toEqual({
            status: "active",
        });
        expect(() => parseUpdateShopSetInput({})).toThrow(
            "UpdateShopSetInput requires at least one field."
        );
    });

    it("validates product create and update payloads", () => {
        expect(
            parseCreateProductSetInput({
                shopId: 1,
                name: "D1 Product",
                sku: "D1-001",
                priceInCents: 1999,
            })
        ).toEqual({
            shopId: 1,
            name: "D1 Product",
            sku: "D1-001",
            priceInCents: 1999,
        });
        expect(parseUpdateProductSetInput({ inventoryCount: 3 })).toEqual({
            inventoryCount: 3,
        });
        expect(() => parseCreateProductSetInput({ shopId: 1 })).toThrow();
    });

    it("validates order create and update payloads", () => {
        expect(
            parseCreateOrderSetInput({
                shopId: 1,
                productId: 2,
                orderNo: "CF-D1-001",
                unitPriceInCents: 1999,
                totalAmountInCents: 3998,
            })
        ).toEqual({
            shopId: 1,
            productId: 2,
            orderNo: "CF-D1-001",
            unitPriceInCents: 1999,
            totalAmountInCents: 3998,
        });
        expect(parseUpdateOrderSetInput({ status: "paid" })).toEqual({
            status: "paid",
        });
        expect(() => parseCreateOrderSetInput({ shopId: 1 })).toThrow();
    });

    it("requires mutation filters for protected business mutations", () => {
        expect(() => parseShopRequiredWhereInput({})).toThrow(
            "ShopFilters requires at least one field."
        );
        expect(() => parseOrderRequiredWhereInput({})).toThrow(
            "OrderFilters requires at least one field."
        );
        expect(
            buildRequiredShopWhereClause(
                parseShopRequiredWhereInput({
                    id: {
                        eq: 1,
                    },
                })
            )
        ).toBeTruthy();
        expect(
            buildRequiredOrderWhereClause(
                parseOrderRequiredWhereInput({
                    orderNo: {
                        eq: "CF-D1-001",
                    },
                })
            )
        ).toBeTruthy();
    });

    it("supports createdAt DateTime filters for order queries", () => {
        const parsedWhere = parseOrderWhereInput({
            createdAt: {
                gte: "2026-06-01T00:00:00Z",
                lt: "2026-06-09T00:00:00Z",
            },
        });

        expect(parsedWhere.createdAt?.gte).toBeInstanceOf(Date);
        expect(parsedWhere.createdAt?.lt).toBeInstanceOf(Date);
        expect(buildOrderRelationWhere(parsedWhere)).toEqual({
            createdAt: {
                gte: new Date("2026-06-01T00:00:00.000Z"),
                lt: new Date("2026-06-09T00:00:00.000Z"),
            },
        });
    });
});

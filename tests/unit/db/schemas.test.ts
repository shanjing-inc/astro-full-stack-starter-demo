import { getTableConfig } from "drizzle-orm/mysql-core";
import { describe, expect, it } from "vitest";

import {
    account,
    session,
    user,
    verification,
} from "@shanjing/astro-full-stack-starter/db/mysql/schemas";

import {
    dbSchema,
    order,
    orderStatusEnum,
    product,
    productStatusEnum,
    shop,
    shopStatusEnum,
} from "@/db/schemas";

describe("database schemas", () => {
    it("exports all app tables and status enum values", () => {
        expect(Object.keys(dbSchema)).toEqual([
            "user",
            "session",
            "account",
            "verification",
            "shop",
            "product",
            "order",
        ]);
        expect(shopStatusEnum).toEqual(["draft", "active", "archived"]);
        expect(productStatusEnum).toEqual(["draft", "active", "archived"]);
        expect(orderStatusEnum).toEqual(["pending", "paid", "shipped", "completed", "cancelled"]);
    });

    it("declares indexes and foreign keys for auth and commerce tables", () => {
        const configs = [
            getTableConfig(user),
            getTableConfig(session),
            getTableConfig(account),
            getTableConfig(verification),
            getTableConfig(shop),
            getTableConfig(product),
            getTableConfig(order),
        ];

        expect(configs.map((config) => config.name)).toEqual([
            "user",
            "session",
            "account",
            "verification",
            "shop",
            "product",
            "order",
        ]);
        expect(getTableConfig(user).indexes.map((index) => index.config.name)).toEqual([
            "user_email_unique",
            "user_role_idx",
        ]);
        expect(getTableConfig(product).foreignKeys).toHaveLength(1);
        expect(getTableConfig(order).foreignKeys).toHaveLength(2);
    });

    it("resolves foreign key references for auth and commerce tables", () => {
        const foreignKeyReferences = [
            ...getTableConfig(session).foreignKeys,
            ...getTableConfig(account).foreignKeys,
            ...getTableConfig(product).foreignKeys,
            ...getTableConfig(order).foreignKeys,
        ].map((foreignKey) => foreignKey.reference());

        expect(
            foreignKeyReferences.map((reference) =>
                reference.foreignColumns.map((column) => column.name)
            )
        ).toEqual([["id"], ["id"], ["id"], ["id"], ["id"]]);
        expect(
            foreignKeyReferences.map((reference) => reference.columns.map((column) => column.name))
        ).toEqual([["user_id"], ["user_id"], ["shop_id"], ["shop_id"], ["product_id"]]);
    });
});

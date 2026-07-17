import { getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it, vi } from "vitest";

import { dbRelations } from "@/db/relations";
import { dbSchema, order, product, shop, user } from "@/db/schemas";

import {
    createSqliteTestDatabase,
    createSqliteTestDatabaseProvider,
} from "../fixtures/sqlite/provider";
import { createShopOrderFixture, createShopOrderFixtureList } from "../fixtures/sqlite/factories";
import { initializeSqliteTestDatabase } from "../fixtures/sqlite/setup";

describe("Cloudflare D1 demo SQLite test provider", () => {
    it("reuses the project schema and relations for SQLite tests", () => {
        const provider = createSqliteTestDatabaseProvider();

        expect(provider.dialect).toBe("sqlite");
        expect(provider.schema).toBe(dbSchema);
        expect(provider.relations).toBe(dbRelations);
        expect(provider.schema.shop).toBe(shop);
        expect(provider.schema.product).toBe(product);
        expect(provider.schema.order).toBe(order);
        expect(provider.schema.user).toBe(user);
    });

    it("uses sqlite table metadata for project business tables", () => {
        const provider = createSqliteTestDatabaseProvider();
        const shopTableConfig = getTableConfig(provider.schema.shop);

        expect(shopTableConfig.name).toBe("shop");
        expect(shopTableConfig.columns.map((column) => column.name)).toEqual([
            "id",
            "name",
            "slug",
            "status",
            "created_at",
            "updated_at",
        ]);
    });

    it("creates the injected test database lazily", () => {
        const sqliteDb = createSqliteTestDatabase();
        const createDb = vi.fn(() => sqliteDb);
        const provider = createSqliteTestDatabaseProvider({ createDb });

        expect(createDb).not.toHaveBeenCalled();
        expect(provider.getDb()).toBe(sqliteDb);
        expect(provider.getDb()).toBe(sqliteDb);
        expect(createDb).toHaveBeenCalledTimes(1);
    });

    it("creates a better-sqlite3 backed in-memory database by default", () => {
        const provider = createSqliteTestDatabaseProvider();
        const db = provider.getDb();

        expect(provider.getDb()).toBe(db);
        expect(db.$client.prepare("select 1 as value").get()).toEqual({
            value: 1,
        });
    });

    it("provides linked business records for resolver tests", () => {
        const records = createShopOrderFixture();

        expect(records.product.shopId).toBe(records.shop.id);
        expect(records.order.shopId).toBe(records.shop.id);
        expect(records.order.productId).toBe(records.product.id);
        expect(records.order.totalAmountInCents).toBe(
            records.order.quantity * records.product.priceInCents
        );
        expect(records.shop.createdAt).toBeInstanceOf(Date);
    });

    it("allows overriding fixture records for edge case tests", () => {
        const records = createShopOrderFixture({
            order: {
                quantity: 3,
                status: "cancelled",
                totalAmountInCents: 3897,
            },
            product: {
                inventoryCount: 0,
                status: "archived",
            },
        });

        expect(records.product.shopId).toBe(records.shop.id);
        expect(records.order.productId).toBe(records.product.id);
        expect(records.order.quantity).toBe(3);
        expect(records.order.status).toBe("cancelled");
        expect(records.product.status).toBe("archived");
    });

    it("provides list fixtures for resolver collection tests", () => {
        const records = createShopOrderFixtureList();

        expect(records.shops.map((record) => record.slug)).toEqual([
            "sqlite-test-shop",
            "archived-sqlite-shop",
        ]);
        expect(
            records.products.every((record) =>
                records.shops.some((shopRecord) => shopRecord.id === record.shopId)
            )
        ).toBe(true);
        expect(
            records.orders.every((record) =>
                records.products.some((productRecord) => productRecord.id === record.productId)
            )
        ).toBe(true);
        expect(records.orders.map((record) => record.status)).toEqual(["paid", "pending"]);
    });

    it("initializes tables from generated project schema SQL and lets tests insert records", () => {
        const provider = createSqliteTestDatabaseProvider();
        const db = provider.getDb();
        const records = createShopOrderFixture();

        try {
            initializeSqliteTestDatabase(db);
            db.insert(provider.schema.user)
                .values({
                    email: "sqlite-user@example.com",
                    id: 101,
                    name: "SQLite User",
                })
                .run();
            db.insert(provider.schema.shop).values(records.shop).run();
            db.insert(provider.schema.product).values(records.product).run();
            db.insert(provider.schema.order).values(records.order).run();

            expect(db.select().from(provider.schema.user).all()).toMatchObject([
                {
                    email: "sqlite-user@example.com",
                    id: 101,
                    name: "SQLite User",
                },
            ]);
            expect(db.select().from(provider.schema.order).all()).toMatchObject([
                {
                    id: records.order.id,
                    orderNo: records.order.orderNo,
                    productId: records.product.id,
                    quantity: records.order.quantity,
                    shopId: records.shop.id,
                    status: records.order.status,
                },
            ]);
        } finally {
            db.$client.close();
        }
    });
});

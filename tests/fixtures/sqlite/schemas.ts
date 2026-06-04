import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import {
    createSqliteDbSchema,
    sqliteTimestampDefault,
} from "@shanjing/astro-full-stack-starter/db/sqlite/schemas";

export {
    account,
    session,
    user,
    verification,
} from "@shanjing/astro-full-stack-starter/db/sqlite/schemas";

export const shopStatusEnum = ["draft", "active", "archived"] as const;
export const productStatusEnum = ["draft", "active", "archived"] as const;
export const orderStatusEnum = ["pending", "paid", "shipped", "completed", "cancelled"] as const;

export const shop = sqliteTable(
    "shop",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        name: text("name").notNull(),
        slug: text("slug").notNull(),
        status: text("status", { enum: shopStatusEnum }).notNull().default("draft"),
        createdAt: integer("created_at", { mode: "timestamp" })
            .notNull()
            .default(sqliteTimestampDefault),
        updatedAt: integer("updated_at", { mode: "timestamp" })
            .notNull()
            .default(sqliteTimestampDefault),
    },
    (table) => [
        uniqueIndex("shop_slug_unique").on(table.slug),
        index("shop_status_idx").on(table.status),
    ]
);

export const product = sqliteTable(
    "product",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        shopId: integer("shop_id")
            .notNull()
            .references(() => shop.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        sku: text("sku").notNull(),
        priceInCents: integer("price_in_cents").notNull(),
        inventoryCount: integer("inventory_count").notNull().default(0),
        status: text("status", { enum: productStatusEnum }).notNull().default("draft"),
        createdAt: integer("created_at", { mode: "timestamp" })
            .notNull()
            .default(sqliteTimestampDefault),
        updatedAt: integer("updated_at", { mode: "timestamp" })
            .notNull()
            .default(sqliteTimestampDefault),
    },
    (table) => [
        uniqueIndex("product_shop_sku_unique").on(table.shopId, table.sku),
        index("product_shop_id_idx").on(table.shopId),
        index("product_status_idx").on(table.status),
    ]
);

export const order = sqliteTable(
    "order",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        shopId: integer("shop_id")
            .notNull()
            .references(() => shop.id, { onDelete: "cascade" }),
        productId: integer("product_id")
            .notNull()
            .references(() => product.id, { onDelete: "cascade" }),
        orderNo: text("order_no").notNull(),
        quantity: integer("quantity").notNull().default(1),
        unitPriceInCents: integer("unit_price_in_cents").notNull(),
        totalAmountInCents: integer("total_amount_in_cents").notNull(),
        status: text("status", { enum: orderStatusEnum }).notNull().default("pending"),
        remark: text("remark"),
        createdAt: integer("created_at", { mode: "timestamp" })
            .notNull()
            .default(sqliteTimestampDefault),
        updatedAt: integer("updated_at", { mode: "timestamp" })
            .notNull()
            .default(sqliteTimestampDefault),
    },
    (table) => [
        uniqueIndex("order_order_no_unique").on(table.orderNo),
        index("order_shop_id_idx").on(table.shopId),
        index("order_product_id_idx").on(table.productId),
        index("order_status_idx").on(table.status),
    ]
);

export const projectSqliteDbSchema = {
    shop,
    product,
    order,
};

export const sqliteDbSchema = createSqliteDbSchema(projectSqliteDbSchema);

export type SqliteShop = typeof shop.$inferSelect;
export type NewSqliteShop = typeof shop.$inferInsert;
export type SqliteProduct = typeof product.$inferSelect;
export type NewSqliteProduct = typeof product.$inferInsert;
export type SqliteOrder = typeof order.$inferSelect;
export type NewSqliteOrder = typeof order.$inferInsert;

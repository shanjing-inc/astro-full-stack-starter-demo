import { sql } from "drizzle-orm";
import { index, int, mysqlTable, text, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { createDbSchema, zonedDateTime } from "@shanjing/astro-full-stack-starter/db/mysql/schemas";

export {
    account,
    session,
    user,
    verification,
} from "@shanjing/astro-full-stack-starter/db/mysql/schemas";

export const shopStatusEnum = ["draft", "active", "archived"] as const;
export const productStatusEnum = ["draft", "active", "archived"] as const;
export const orderStatusEnum = ["pending", "paid", "shipped", "completed", "cancelled"] as const;

export const shop = mysqlTable(
    "shop",
    {
        id: int("id").autoincrement().primaryKey(),
        name: varchar("name", { length: 255 }).notNull(),
        slug: varchar("slug", { length: 255 }).notNull(),
        status: varchar("status", { length: 32, enum: shopStatusEnum }).notNull().default("draft"),
        createdAt: zonedDateTime("created_at")
            .notNull()
            .default(sql`CURRENT_TIMESTAMP`),
        updatedAt: zonedDateTime("updated_at")
            .notNull()
            .default(sql`CURRENT_TIMESTAMP`)
            .onUpdateNow(),
    },
    (table) => [
        uniqueIndex("shop_slug_unique").on(table.slug),
        index("shop_status_idx").on(table.status),
    ]
);

export const product = mysqlTable(
    "product",
    {
        id: int("id").autoincrement().primaryKey(),
        shopId: int("shop_id")
            .notNull()
            .references(() => shop.id, { onDelete: "cascade" }),
        name: varchar("name", { length: 255 }).notNull(),
        sku: varchar("sku", { length: 64 }).notNull(),
        priceInCents: int("price_in_cents").notNull(),
        inventoryCount: int("inventory_count").notNull().default(0),
        status: varchar("status", { length: 32, enum: productStatusEnum })
            .notNull()
            .default("draft"),
        createdAt: zonedDateTime("created_at")
            .notNull()
            .default(sql`CURRENT_TIMESTAMP`),
        updatedAt: zonedDateTime("updated_at")
            .notNull()
            .default(sql`CURRENT_TIMESTAMP`)
            .onUpdateNow(),
    },
    (table) => [
        uniqueIndex("product_shop_sku_unique").on(table.shopId, table.sku),
        index("product_shop_id_idx").on(table.shopId),
        index("product_status_idx").on(table.status),
    ]
);

export const order = mysqlTable(
    "order",
    {
        id: int("id").autoincrement().primaryKey(),
        shopId: int("shop_id")
            .notNull()
            .references(() => shop.id, { onDelete: "cascade" }),
        productId: int("product_id")
            .notNull()
            .references(() => product.id, { onDelete: "cascade" }),
        orderNo: varchar("order_no", { length: 64 }).notNull(),
        quantity: int("quantity").notNull().default(1),
        unitPriceInCents: int("unit_price_in_cents").notNull(),
        totalAmountInCents: int("total_amount_in_cents").notNull(),
        status: varchar("status", { length: 32, enum: orderStatusEnum })
            .notNull()
            .default("pending"),
        remark: text("remark"),
        createdAt: zonedDateTime("created_at")
            .notNull()
            .default(sql`CURRENT_TIMESTAMP`),
        updatedAt: zonedDateTime("updated_at")
            .notNull()
            .default(sql`CURRENT_TIMESTAMP`)
            .onUpdateNow(),
    },
    (table) => [
        uniqueIndex("order_order_no_unique").on(table.orderNo),
        index("order_shop_id_idx").on(table.shopId),
        index("order_product_id_idx").on(table.productId),
        index("order_status_idx").on(table.status),
    ]
);

export const projectDbSchema = {
    shop,
    product,
    order,
};

export const dbSchema = createDbSchema(projectDbSchema);

export type Shop = typeof shop.$inferSelect;
export type NewShop = typeof shop.$inferInsert;
export type Product = typeof product.$inferSelect;
export type NewProduct = typeof product.$inferInsert;
export type Order = typeof order.$inferSelect;
export type NewOrder = typeof order.$inferInsert;

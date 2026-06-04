import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import {
    createD1DbSchema,
    d1TimestampDefault,
} from "@shanjing/astro-full-stack-starter/db/d1/schemas";

export {
    account,
    session,
    user,
    verification,
} from "@shanjing/astro-full-stack-starter/db/d1/schemas";

export const shopStatusEnum = ["draft", "active", "archived"] as const;
export const productStatusEnum = ["draft", "active", "archived"] as const;
export const orderStatusEnum = ["pending", "paid", "shipped", "completed", "cancelled"] as const;
export const queueExecutionStatusEnum = [
    "queued",
    "processing",
    "completed",
    "retrying",
    "failed",
] as const;

export const shop = sqliteTable(
    "shop",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        name: text("name").notNull(),
        slug: text("slug").notNull(),
        status: text("status", { enum: shopStatusEnum }).notNull().default("draft"),
        createdAt: integer("created_at", { mode: "timestamp" })
            .notNull()
            .default(d1TimestampDefault),
        updatedAt: integer("updated_at", { mode: "timestamp" })
            .notNull()
            .default(d1TimestampDefault),
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
            .default(d1TimestampDefault),
        updatedAt: integer("updated_at", { mode: "timestamp" })
            .notNull()
            .default(d1TimestampDefault),
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
            .default(d1TimestampDefault),
        updatedAt: integer("updated_at", { mode: "timestamp" })
            .notNull()
            .default(d1TimestampDefault),
    },
    (table) => [
        uniqueIndex("order_order_no_unique").on(table.orderNo),
        index("order_shop_id_idx").on(table.shopId),
        index("order_product_id_idx").on(table.productId),
        index("order_status_idx").on(table.status),
    ]
);

export const queueExecution = sqliteTable(
    "queue_execution",
    {
        id: text("id").primaryKey(),
        jobId: text("job_id").notNull(),
        messageId: text("message_id"),
        queueName: text("queue_name").notNull(),
        jobName: text("job_name").notNull(),
        mode: text("mode"),
        source: text("source"),
        status: text("status", { enum: queueExecutionStatusEnum }).notNull().default("queued"),
        attempt: integer("attempt").notNull().default(1),
        requestedAt: text("requested_at").notNull(),
        processedAt: text("processed_at"),
        retryOfRecordId: text("retry_of_record_id"),
        physicalQueueName: text("physical_queue_name"),
        payload: text("payload"),
        result: text("result"),
        error: text("error"),
        createdAt: text("created_at")
            .notNull()
            .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
        updatedAt: text("updated_at")
            .notNull()
            .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    },
    (table) => [
        index("queue_execution_job_id_idx").on(table.jobId),
        index("queue_execution_queue_updated_at_idx").on(table.queueName, table.updatedAt),
        index("queue_execution_retry_of_record_id_idx").on(table.retryOfRecordId),
        index("queue_execution_status_updated_at_idx").on(table.status, table.updatedAt),
        index("queue_execution_status_idx").on(table.status),
        index("queue_execution_updated_at_idx").on(table.updatedAt),
    ]
);

export const projectD1DbSchema = {
    shop,
    product,
    order,
    queueExecution,
};

export const dbSchema = createD1DbSchema(projectD1DbSchema);

export const insertShopDefaultValues = {
    createdAt: sql`unixepoch()`,
    updatedAt: sql`unixepoch()`,
};

export const insertProductDefaultValues = {
    createdAt: sql`unixepoch()`,
    updatedAt: sql`unixepoch()`,
};

export const insertOrderDefaultValues = {
    createdAt: sql`unixepoch()`,
    updatedAt: sql`unixepoch()`,
};

export type Shop = typeof shop.$inferSelect;
export type NewShop = typeof shop.$inferInsert;
export type Product = typeof product.$inferSelect;
export type NewProduct = typeof product.$inferInsert;
export type Order = typeof order.$inferSelect;
export type NewOrder = typeof order.$inferInsert;
export type QueueExecution = typeof queueExecution.$inferSelect;
export type NewQueueExecution = typeof queueExecution.$inferInsert;

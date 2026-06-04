import { defineRelations } from "drizzle-orm";

import { createBaseSqliteRelationsConfig } from "@shanjing/astro-full-stack-starter/db/sqlite/relations";

import { sqliteDbSchema } from "./schemas";

export { sqliteDbSchema };

export const sqliteDbRelations = defineRelations(sqliteDbSchema, (r) => ({
    ...createBaseSqliteRelationsConfig(r),
    shop: {
        products: r.many.product({
            from: r.shop.id,
            to: r.product.shopId,
        }),
        orders: r.many.order({
            from: r.shop.id,
            to: r.order.shopId,
        }),
    },
    product: {
        shop: r.one.shop({
            from: r.product.shopId,
            to: r.shop.id,
            optional: false,
        }),
        orders: r.many.order({
            from: r.product.id,
            to: r.order.productId,
        }),
    },
    order: {
        shop: r.one.shop({
            from: r.order.shopId,
            to: r.shop.id,
            optional: false,
        }),
        product: r.one.product({
            from: r.order.productId,
            to: r.product.id,
            optional: false,
        }),
    },
}));

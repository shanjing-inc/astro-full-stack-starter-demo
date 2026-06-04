import { createBaseRelationsConfig } from "@shanjing/astro-full-stack-starter/db/mysql/relations";
import { defineRelations } from "drizzle-orm";

import { dbSchema } from "@/db/schemas";

export { dbSchema };

export const dbRelations = defineRelations(dbSchema, (r) => ({
    ...createBaseRelationsConfig(r),
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

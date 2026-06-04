import { createCloudflareD1DatabaseProvider, getCloudflareD1Env } from "@/db/client";
import { order, product, shop } from "@/db/schemas";

import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async () => {
    const provider = createCloudflareD1DatabaseProvider(getCloudflareD1Env());
    const db = provider.getDb();
    const [shopRows, productRows, orderRows] = await Promise.all([
        db.select({ id: shop.id }).from(shop).limit(1),
        db.select({ id: product.id }).from(product).limit(1),
        db.select({ id: order.id }).from(order).limit(1),
    ]);

    return Response.json({
        ok: true,
        dialect: provider.dialect,
        rowCount: shopRows.length,
        tableRows: {
            order: orderRows.length,
            product: productRows.length,
            shop: shopRows.length,
        },
    });
};

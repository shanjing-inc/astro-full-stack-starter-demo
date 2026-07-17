import type { SqliteOrder, SqliteProduct, SqliteShop } from "./schemas";

export interface CreateShopOrderFixtureOptions {
    order?: Partial<SqliteOrder>;
    product?: Partial<SqliteProduct>;
    shop?: Partial<SqliteShop>;
}

export function createShopOrderFixture(options: CreateShopOrderFixtureOptions = {}): {
    order: SqliteOrder;
    product: SqliteProduct;
    shop: SqliteShop;
} {
    const createdAt = new Date("2026-05-22T00:00:00.000Z");
    const updatedAt = new Date("2026-05-22T00:00:00.000Z");
    const shop: SqliteShop = {
        createdAt,
        id: 1,
        name: "SQLite Test Shop",
        slug: "sqlite-test-shop",
        status: "active",
        updatedAt,
        ...options.shop,
    };
    const product: SqliteProduct = {
        createdAt,
        id: 11,
        inventoryCount: 20,
        name: "SQLite Test Product",
        priceInCents: 1299,
        shopId: shop.id,
        sku: "SQLITE-SKU-001",
        status: "active",
        updatedAt,
        ...options.product,
    };
    const order: SqliteOrder = {
        createdAt,
        id: 21,
        orderNo: "SQLITE-ORDER-001",
        productId: product.id,
        quantity: 2,
        remark: "fixture order",
        shopId: shop.id,
        status: "paid",
        totalAmountInCents: 2598,
        unitPriceInCents: product.priceInCents,
        updatedAt,
        ...options.order,
    };

    return {
        order,
        product,
        shop,
    };
}

export function createShopOrderFixtureList(): {
    orders: SqliteOrder[];
    products: SqliteProduct[];
    shops: SqliteShop[];
} {
    const activeRecords = createShopOrderFixture();
    const archivedRecords = createShopOrderFixture({
        order: {
            id: 22,
            orderNo: "SQLITE-ORDER-002",
            quantity: 1,
            remark: "archived shop order",
            status: "pending",
            totalAmountInCents: 1899,
            unitPriceInCents: 1899,
        },
        product: {
            id: 12,
            inventoryCount: 0,
            name: "Archived Shop Product",
            priceInCents: 1899,
            sku: "SQLITE-SKU-002",
            status: "draft",
        },
        shop: {
            id: 2,
            name: "Archived SQLite Shop",
            slug: "archived-sqlite-shop",
            status: "archived",
        },
    });

    return {
        orders: [activeRecords.order, archivedRecords.order],
        products: [activeRecords.product, archivedRecords.product],
        shops: [activeRecords.shop, archivedRecords.shop],
    };
}

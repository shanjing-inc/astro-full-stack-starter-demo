/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
    T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
export type ListMemberOrdersQueryVariables = Exact<{
    limit?: number | null | undefined;
    offset?: number | null | undefined;
}>;

export type ListMemberOrdersQuery = {
    listOrders: Array<{
        id: string | null;
        shopId: number | null;
        productId: number | null;
        orderNo: string | null;
        quantity: number | null;
        unitPriceInCents: number | null;
        totalAmountInCents: number | null;
        status: string | null;
        remark: string | null;
        createdAt: string | null;
        updatedAt: string | null;
        shop: { id: string | null; name: string | null; slug: string | null } | null;
        product: { id: string | null; name: string | null; sku: string | null } | null;
    }> | null;
};

export type ListMemberProductsQueryVariables = Exact<{
    limit?: number | null | undefined;
    offset?: number | null | undefined;
}>;

export type ListMemberProductsQuery = {
    listProducts: Array<{
        id: string | null;
        shopId: number | null;
        name: string | null;
        sku: string | null;
        priceInCents: number | null;
        inventoryCount: number | null;
        status: string | null;
        createdAt: string | null;
        updatedAt: string | null;
        shop: { id: string | null; name: string | null; slug: string | null } | null;
        orders: Array<{ id: string | null; orderNo: string | null }> | null;
    }> | null;
};

export type ListMemberShopsQueryVariables = Exact<{
    limit?: number | null | undefined;
    offset?: number | null | undefined;
}>;

export type ListMemberShopsQuery = {
    listShops: Array<{
        id: string | null;
        name: string | null;
        slug: string | null;
        status: string | null;
        createdAt: string | null;
        updatedAt: string | null;
        products: Array<{ id: string | null; name: string | null }> | null;
        orders: Array<{ id: string | null; orderNo: string | null }> | null;
    }> | null;
};

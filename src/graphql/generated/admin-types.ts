/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
    T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
export type DateTimeFilters = {
    eq?: string | null | undefined;
    gt?: string | null | undefined;
    gte?: string | null | undefined;
    lt?: string | null | undefined;
    lte?: string | null | undefined;
};

export type IntFilters = {
    eq?: number | null | undefined;
    gt?: number | null | undefined;
    gte?: number | null | undefined;
    inArray?: Array<number> | null | undefined;
    isNotNull?: boolean | null | undefined;
    isNull?: boolean | null | undefined;
    lt?: number | null | undefined;
    lte?: number | null | undefined;
    ne?: number | null | undefined;
    notInArray?: Array<number> | null | undefined;
};

export type OrderFilters = {
    createdAt?: DateTimeFilters | null | undefined;
    id?: IntFilters | null | undefined;
    orderNo?: StringFilters | null | undefined;
    productId?: IntFilters | null | undefined;
    shopId?: IntFilters | null | undefined;
    status?: StringFilters | null | undefined;
};

export type ProductFilters = {
    id?: IntFilters | null | undefined;
    shopId?: IntFilters | null | undefined;
    sku?: StringFilters | null | undefined;
    status?: StringFilters | null | undefined;
};

export type ShopFilters = {
    id?: IntFilters | null | undefined;
    slug?: StringFilters | null | undefined;
    status?: StringFilters | null | undefined;
};

export type StringFilters = {
    eq?: string | null | undefined;
    gt?: string | null | undefined;
    gte?: string | null | undefined;
    ilike?: string | null | undefined;
    inArray?: Array<string> | null | undefined;
    isNotNull?: boolean | null | undefined;
    isNull?: boolean | null | undefined;
    like?: string | null | undefined;
    lt?: string | null | undefined;
    lte?: string | null | undefined;
    ne?: string | null | undefined;
    notIlike?: string | null | undefined;
    notInArray?: Array<string> | null | undefined;
    notLike?: string | null | undefined;
};

export type UpdateShopSetInput = {
    name?: string | null | undefined;
    slug?: string | null | undefined;
    status?: string | null | undefined;
};

export type GetAdminDashboardQueryVariables = Exact<{ [key: string]: never }>;

export type GetAdminDashboardQuery = {
    listShops: Array<{
        id: string | null;
        name: string | null;
        status: string | null;
        createdAt: string | null;
    }> | null;
    listProducts: Array<{
        id: string | null;
        name: string | null;
        status: string | null;
        inventoryCount: number | null;
        createdAt: string | null;
    }> | null;
    listOrders: Array<{
        id: string | null;
        orderNo: string | null;
        status: string | null;
        totalAmountInCents: number | null;
        createdAt: string | null;
    }> | null;
};

export type ListAdminOrdersQueryVariables = Exact<{
    where?: OrderFilters | null | undefined;
    limit?: number | null | undefined;
    offset?: number | null | undefined;
}>;

export type ListAdminOrdersQuery = {
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

export type ListAdminProductsQueryVariables = Exact<{
    where?: ProductFilters | null | undefined;
    limit?: number | null | undefined;
    offset?: number | null | undefined;
}>;

export type ListAdminProductsQuery = {
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
        orders: Array<{ id: string | null; orderNo: string | null; status: string | null }> | null;
    }> | null;
};

export type ListAdminShopsQueryVariables = Exact<{
    where?: ShopFilters | null | undefined;
    limit?: number | null | undefined;
    offset?: number | null | undefined;
}>;

export type ListAdminShopsQuery = {
    listShops: Array<{
        id: string | null;
        name: string | null;
        slug: string | null;
        status: string | null;
        createdAt: string | null;
        updatedAt: string | null;
        products: Array<{ id: string | null; name: string | null; sku: string | null }> | null;
        orders: Array<{ id: string | null; orderNo: string | null; status: string | null }> | null;
    }> | null;
};

export type UpdateAdminShopMutationVariables = Exact<{
    set: UpdateShopSetInput;
    where: ShopFilters;
}>;

export type UpdateAdminShopMutation = {
    updateShop: Array<{
        id: string | null;
        name: string | null;
        slug: string | null;
        status: string | null;
        updatedAt: string | null;
    }>;
};

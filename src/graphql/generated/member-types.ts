export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
    [_ in K]?: never;
};
export type Incremental<T> =
    | T
    | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
    ID: { input: string; output: string };
    String: { input: string; output: string };
    Boolean: { input: boolean; output: boolean };
    Int: { input: number; output: number };
    Float: { input: number; output: number };
    JSON: { input: any; output: any };
};

export type CreateOrderSetInput = {
    orderNo: Scalars["String"]["input"];
    productId: Scalars["Int"]["input"];
    quantity?: InputMaybe<Scalars["Int"]["input"]>;
    remark?: InputMaybe<Scalars["String"]["input"]>;
    shopId: Scalars["Int"]["input"];
    status?: InputMaybe<Scalars["String"]["input"]>;
    totalAmountInCents: Scalars["Int"]["input"];
    unitPriceInCents: Scalars["Int"]["input"];
};

export type CreateProductSetInput = {
    inventoryCount?: InputMaybe<Scalars["Int"]["input"]>;
    name: Scalars["String"]["input"];
    priceInCents: Scalars["Int"]["input"];
    shopId: Scalars["Int"]["input"];
    sku: Scalars["String"]["input"];
    status?: InputMaybe<Scalars["String"]["input"]>;
};

export type CreateShopSetInput = {
    name: Scalars["String"]["input"];
    slug: Scalars["String"]["input"];
    status?: InputMaybe<Scalars["String"]["input"]>;
};

export type InnerOrder = {
    direction: OrderDirection;
    priority: Scalars["Int"]["input"];
};

export type IntFilters = {
    eq?: InputMaybe<Scalars["Int"]["input"]>;
    gt?: InputMaybe<Scalars["Int"]["input"]>;
    gte?: InputMaybe<Scalars["Int"]["input"]>;
    inArray?: InputMaybe<Array<Scalars["Int"]["input"]>>;
    isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
    isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
    lt?: InputMaybe<Scalars["Int"]["input"]>;
    lte?: InputMaybe<Scalars["Int"]["input"]>;
    ne?: InputMaybe<Scalars["Int"]["input"]>;
    notInArray?: InputMaybe<Array<Scalars["Int"]["input"]>>;
};

export type Mutation = {
    __typename?: "Mutation";
    createOrder: OrderItem;
    createProduct: ProductItem;
    deleteOrder: Array<OrderItem>;
    deleteProduct: Array<ProductItem>;
    updateOrder: Array<OrderItem>;
    updateProduct: Array<ProductItem>;
};

export type MutationCreateOrderArgs = {
    set: CreateOrderSetInput;
};

export type MutationCreateProductArgs = {
    set: CreateProductSetInput;
};

export type MutationDeleteOrderArgs = {
    where: OrderFilters;
};

export type MutationDeleteProductArgs = {
    where: ProductFilters;
};

export type MutationUpdateOrderArgs = {
    set: UpdateOrderSetInput;
    where: OrderFilters;
};

export type MutationUpdateProductArgs = {
    set: UpdateProductSetInput;
    where: ProductFilters;
};

export enum OrderDirection {
    Asc = "asc",
    Desc = "desc",
}

export type OrderFilters = {
    id?: InputMaybe<IntFilters>;
    orderNo?: InputMaybe<StringFilters>;
    productId?: InputMaybe<IntFilters>;
    shopId?: InputMaybe<IntFilters>;
    status?: InputMaybe<StringFilters>;
};

export type OrderItem = {
    __typename?: "OrderItem";
    createdAt?: Maybe<Scalars["String"]["output"]>;
    id?: Maybe<Scalars["ID"]["output"]>;
    orderNo?: Maybe<Scalars["String"]["output"]>;
    product?: Maybe<ProductItem>;
    productId?: Maybe<Scalars["Int"]["output"]>;
    quantity?: Maybe<Scalars["Int"]["output"]>;
    remark?: Maybe<Scalars["String"]["output"]>;
    shop?: Maybe<ShopItem>;
    shopId?: Maybe<Scalars["Int"]["output"]>;
    status?: Maybe<Scalars["String"]["output"]>;
    totalAmountInCents?: Maybe<Scalars["Int"]["output"]>;
    unitPriceInCents?: Maybe<Scalars["Int"]["output"]>;
    updatedAt?: Maybe<Scalars["String"]["output"]>;
};

export type OrderOrderBy = {
    createdAt?: InputMaybe<InnerOrder>;
    id?: InputMaybe<InnerOrder>;
    orderNo?: InputMaybe<InnerOrder>;
    productId?: InputMaybe<InnerOrder>;
    quantity?: InputMaybe<InnerOrder>;
    shopId?: InputMaybe<InnerOrder>;
    status?: InputMaybe<InnerOrder>;
    totalAmountInCents?: InputMaybe<InnerOrder>;
    unitPriceInCents?: InputMaybe<InnerOrder>;
    updatedAt?: InputMaybe<InnerOrder>;
};

export type ProductFilters = {
    id?: InputMaybe<IntFilters>;
    shopId?: InputMaybe<IntFilters>;
    sku?: InputMaybe<StringFilters>;
    status?: InputMaybe<StringFilters>;
};

export type ProductItem = {
    __typename?: "ProductItem";
    createdAt?: Maybe<Scalars["String"]["output"]>;
    id?: Maybe<Scalars["ID"]["output"]>;
    inventoryCount?: Maybe<Scalars["Int"]["output"]>;
    name?: Maybe<Scalars["String"]["output"]>;
    orders?: Maybe<Array<OrderItem>>;
    priceInCents?: Maybe<Scalars["Int"]["output"]>;
    shop?: Maybe<ShopItem>;
    shopId?: Maybe<Scalars["Int"]["output"]>;
    sku?: Maybe<Scalars["String"]["output"]>;
    status?: Maybe<Scalars["String"]["output"]>;
    updatedAt?: Maybe<Scalars["String"]["output"]>;
};

export type ProductOrderBy = {
    createdAt?: InputMaybe<InnerOrder>;
    id?: InputMaybe<InnerOrder>;
    inventoryCount?: InputMaybe<InnerOrder>;
    name?: InputMaybe<InnerOrder>;
    priceInCents?: InputMaybe<InnerOrder>;
    shopId?: InputMaybe<InnerOrder>;
    sku?: InputMaybe<InnerOrder>;
    status?: InputMaybe<InnerOrder>;
    updatedAt?: InputMaybe<InnerOrder>;
};

export type Query = {
    __typename?: "Query";
    getOrder?: Maybe<OrderItem>;
    getProduct?: Maybe<ProductItem>;
    getShop?: Maybe<ShopItem>;
    listOrders?: Maybe<Array<OrderItem>>;
    listProducts?: Maybe<Array<ProductItem>>;
    listShops?: Maybe<Array<ShopItem>>;
};

export type QueryGetOrderArgs = {
    where: OrderFilters;
};

export type QueryGetProductArgs = {
    where: ProductFilters;
};

export type QueryGetShopArgs = {
    where: ShopFilters;
};

export type QueryListOrdersArgs = {
    limit?: InputMaybe<Scalars["Int"]["input"]>;
    offset?: InputMaybe<Scalars["Int"]["input"]>;
    orderBy?: InputMaybe<OrderOrderBy>;
    where?: InputMaybe<OrderFilters>;
};

export type QueryListProductsArgs = {
    limit?: InputMaybe<Scalars["Int"]["input"]>;
    offset?: InputMaybe<Scalars["Int"]["input"]>;
    orderBy?: InputMaybe<ProductOrderBy>;
    where?: InputMaybe<ProductFilters>;
};

export type QueryListShopsArgs = {
    limit?: InputMaybe<Scalars["Int"]["input"]>;
    offset?: InputMaybe<Scalars["Int"]["input"]>;
    orderBy?: InputMaybe<ShopOrderBy>;
    where?: InputMaybe<ShopFilters>;
};

export type ShopFilters = {
    id?: InputMaybe<IntFilters>;
    slug?: InputMaybe<StringFilters>;
    status?: InputMaybe<StringFilters>;
};

export type ShopItem = {
    __typename?: "ShopItem";
    createdAt?: Maybe<Scalars["String"]["output"]>;
    id?: Maybe<Scalars["ID"]["output"]>;
    name?: Maybe<Scalars["String"]["output"]>;
    orders?: Maybe<Array<OrderItem>>;
    products?: Maybe<Array<ProductItem>>;
    slug?: Maybe<Scalars["String"]["output"]>;
    status?: Maybe<Scalars["String"]["output"]>;
    updatedAt?: Maybe<Scalars["String"]["output"]>;
};

export type ShopOrderBy = {
    createdAt?: InputMaybe<InnerOrder>;
    id?: InputMaybe<InnerOrder>;
    name?: InputMaybe<InnerOrder>;
    slug?: InputMaybe<InnerOrder>;
    status?: InputMaybe<InnerOrder>;
    updatedAt?: InputMaybe<InnerOrder>;
};

export type StringFilters = {
    eq?: InputMaybe<Scalars["String"]["input"]>;
    gt?: InputMaybe<Scalars["String"]["input"]>;
    gte?: InputMaybe<Scalars["String"]["input"]>;
    ilike?: InputMaybe<Scalars["String"]["input"]>;
    inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
    isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
    isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
    like?: InputMaybe<Scalars["String"]["input"]>;
    lt?: InputMaybe<Scalars["String"]["input"]>;
    lte?: InputMaybe<Scalars["String"]["input"]>;
    ne?: InputMaybe<Scalars["String"]["input"]>;
    notIlike?: InputMaybe<Scalars["String"]["input"]>;
    notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
    notLike?: InputMaybe<Scalars["String"]["input"]>;
};

export type UpdateOrderSetInput = {
    orderNo?: InputMaybe<Scalars["String"]["input"]>;
    productId?: InputMaybe<Scalars["Int"]["input"]>;
    quantity?: InputMaybe<Scalars["Int"]["input"]>;
    remark?: InputMaybe<Scalars["String"]["input"]>;
    shopId?: InputMaybe<Scalars["Int"]["input"]>;
    status?: InputMaybe<Scalars["String"]["input"]>;
    totalAmountInCents?: InputMaybe<Scalars["Int"]["input"]>;
    unitPriceInCents?: InputMaybe<Scalars["Int"]["input"]>;
};

export type UpdateProductSetInput = {
    inventoryCount?: InputMaybe<Scalars["Int"]["input"]>;
    name?: InputMaybe<Scalars["String"]["input"]>;
    priceInCents?: InputMaybe<Scalars["Int"]["input"]>;
    shopId?: InputMaybe<Scalars["Int"]["input"]>;
    sku?: InputMaybe<Scalars["String"]["input"]>;
    status?: InputMaybe<Scalars["String"]["input"]>;
};

export type UpdateShopSetInput = {
    name?: InputMaybe<Scalars["String"]["input"]>;
    slug?: InputMaybe<Scalars["String"]["input"]>;
    status?: InputMaybe<Scalars["String"]["input"]>;
};

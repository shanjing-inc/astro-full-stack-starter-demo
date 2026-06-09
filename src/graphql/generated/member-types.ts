export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** DateTime instant serialized as a second-level UTC ISO string. Inputs must include Z or a UTC offset in UTC mode; legacy strings without timezone use TZ when TZ is non-UTC. */
  DateTime: { input: string; output: string; }
  JSON: { input: any; output: any; }
};

export type CreateOrderSetInput = {
  orderNo: Scalars['String']['input'];
  productId: Scalars['Int']['input'];
  quantity?: InputMaybe<Scalars['Int']['input']>;
  remark?: InputMaybe<Scalars['String']['input']>;
  shopId: Scalars['Int']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
  totalAmountInCents: Scalars['Int']['input'];
  unitPriceInCents: Scalars['Int']['input'];
};

export type CreateProductSetInput = {
  inventoryCount?: InputMaybe<Scalars['Int']['input']>;
  name: Scalars['String']['input'];
  priceInCents: Scalars['Int']['input'];
  shopId: Scalars['Int']['input'];
  sku: Scalars['String']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
};

export type CreateShopSetInput = {
  name: Scalars['String']['input'];
  slug: Scalars['String']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
};

export type DateTimeFilters = {
  eq?: InputMaybe<Scalars['DateTime']['input']>;
  gt?: InputMaybe<Scalars['DateTime']['input']>;
  gte?: InputMaybe<Scalars['DateTime']['input']>;
  lt?: InputMaybe<Scalars['DateTime']['input']>;
  lte?: InputMaybe<Scalars['DateTime']['input']>;
};

export type InnerOrder = {
  direction: OrderDirection;
  priority: Scalars['Int']['input'];
};

export type IntFilters = {
  eq?: InputMaybe<Scalars['Int']['input']>;
  gt?: InputMaybe<Scalars['Int']['input']>;
  gte?: InputMaybe<Scalars['Int']['input']>;
  inArray?: InputMaybe<Array<Scalars['Int']['input']>>;
  isNotNull?: InputMaybe<Scalars['Boolean']['input']>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<Scalars['Int']['input']>;
  lte?: InputMaybe<Scalars['Int']['input']>;
  ne?: InputMaybe<Scalars['Int']['input']>;
  notInArray?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export enum OrderDirection {
  Asc = 'asc',
  Desc = 'desc'
}

export type OrderFilters = {
  createdAt?: InputMaybe<DateTimeFilters>;
  id?: InputMaybe<IntFilters>;
  orderNo?: InputMaybe<StringFilters>;
  productId?: InputMaybe<IntFilters>;
  shopId?: InputMaybe<IntFilters>;
  status?: InputMaybe<StringFilters>;
};

export type OrderItem = {
  __typename?: 'OrderItem';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  orderNo?: Maybe<Scalars['String']['output']>;
  product?: Maybe<ProductItem>;
  productId?: Maybe<Scalars['Int']['output']>;
  quantity?: Maybe<Scalars['Int']['output']>;
  remark?: Maybe<Scalars['String']['output']>;
  shop?: Maybe<ShopItem>;
  shopId?: Maybe<Scalars['Int']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  totalAmountInCents?: Maybe<Scalars['Int']['output']>;
  unitPriceInCents?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
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
  __typename?: 'ProductItem';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  inventoryCount?: Maybe<Scalars['Int']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  orders?: Maybe<Array<OrderItem>>;
  priceInCents?: Maybe<Scalars['Int']['output']>;
  shop?: Maybe<ShopItem>;
  shopId?: Maybe<Scalars['Int']['output']>;
  sku?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
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
  __typename?: 'Query';
  getCurrentUser?: Maybe<UserItem>;
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
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<OrderOrderBy>;
  where?: InputMaybe<OrderFilters>;
};


export type QueryListProductsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<ProductOrderBy>;
  where?: InputMaybe<ProductFilters>;
};


export type QueryListShopsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<ShopOrderBy>;
  where?: InputMaybe<ShopFilters>;
};

export type ShopFilters = {
  id?: InputMaybe<IntFilters>;
  slug?: InputMaybe<StringFilters>;
  status?: InputMaybe<StringFilters>;
};

export type ShopItem = {
  __typename?: 'ShopItem';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  orders?: Maybe<Array<OrderItem>>;
  products?: Maybe<Array<ProductItem>>;
  slug?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
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
  eq?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  inArray?: InputMaybe<Array<Scalars['String']['input']>>;
  isNotNull?: InputMaybe<Scalars['Boolean']['input']>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  like?: InputMaybe<Scalars['String']['input']>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  ne?: InputMaybe<Scalars['String']['input']>;
  notIlike?: InputMaybe<Scalars['String']['input']>;
  notInArray?: InputMaybe<Array<Scalars['String']['input']>>;
  notLike?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOrderSetInput = {
  orderNo?: InputMaybe<Scalars['String']['input']>;
  productId?: InputMaybe<Scalars['Int']['input']>;
  quantity?: InputMaybe<Scalars['Int']['input']>;
  remark?: InputMaybe<Scalars['String']['input']>;
  shopId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  totalAmountInCents?: InputMaybe<Scalars['Int']['input']>;
  unitPriceInCents?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateProductSetInput = {
  inventoryCount?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  priceInCents?: InputMaybe<Scalars['Int']['input']>;
  shopId?: InputMaybe<Scalars['Int']['input']>;
  sku?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateShopSetInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserSetInput = {
  banExpires?: InputMaybe<Scalars['DateTime']['input']>;
  banReason?: InputMaybe<Scalars['String']['input']>;
  banned?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
};

export type UserFilters = {
  banned?: InputMaybe<Scalars['Boolean']['input']>;
  email?: InputMaybe<StringFilters>;
  emailVerified?: InputMaybe<Scalars['Boolean']['input']>;
  id?: InputMaybe<IntFilters>;
  role?: InputMaybe<StringFilters>;
};

export type UserItem = {
  __typename?: 'UserItem';
  banExpires?: Maybe<Scalars['DateTime']['output']>;
  banReason?: Maybe<Scalars['String']['output']>;
  banned?: Maybe<Scalars['Boolean']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  emailVerified?: Maybe<Scalars['Boolean']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  image?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  role?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type UserOrderBy = {
  createdAt?: InputMaybe<InnerOrder>;
  email?: InputMaybe<InnerOrder>;
  id?: InputMaybe<InnerOrder>;
  name?: InputMaybe<InnerOrder>;
  role?: InputMaybe<InnerOrder>;
  updatedAt?: InputMaybe<InnerOrder>;
};

export type ListMemberOrdersQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListMemberOrdersQuery = { __typename?: 'Query', listOrders?: Array<{ __typename?: 'OrderItem', id?: string | null, shopId?: number | null, productId?: number | null, orderNo?: string | null, quantity?: number | null, unitPriceInCents?: number | null, totalAmountInCents?: number | null, status?: string | null, remark?: string | null, createdAt?: string | null, updatedAt?: string | null, shop?: { __typename?: 'ShopItem', id?: string | null, name?: string | null, slug?: string | null } | null, product?: { __typename?: 'ProductItem', id?: string | null, name?: string | null, sku?: string | null } | null }> | null };

export type ListMemberProductsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListMemberProductsQuery = { __typename?: 'Query', listProducts?: Array<{ __typename?: 'ProductItem', id?: string | null, shopId?: number | null, name?: string | null, sku?: string | null, priceInCents?: number | null, inventoryCount?: number | null, status?: string | null, createdAt?: string | null, updatedAt?: string | null, shop?: { __typename?: 'ShopItem', id?: string | null, name?: string | null, slug?: string | null } | null, orders?: Array<{ __typename?: 'OrderItem', id?: string | null, orderNo?: string | null }> | null }> | null };

export type ListMemberShopsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListMemberShopsQuery = { __typename?: 'Query', listShops?: Array<{ __typename?: 'ShopItem', id?: string | null, name?: string | null, slug?: string | null, status?: string | null, createdAt?: string | null, updatedAt?: string | null, products?: Array<{ __typename?: 'ProductItem', id?: string | null, name?: string | null }> | null, orders?: Array<{ __typename?: 'OrderItem', id?: string | null, orderNo?: string | null }> | null }> | null };

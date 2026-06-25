import { gql } from "@apollo/client/core";
import { FilterIcon, RefreshCwIcon, RotateCcwIcon } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DataTable,
    DateTimeCell,
    MoneyCell,
    SELECT_EMPTY_VALUE,
    parsePageParam,
    parsePageSizeParam,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    StatusBadge,
    TablePagination,
    useDashboardQuery,
    useResettableFilterForm,
    type DataTableColumn,
} from "@shanjing/astro-full-stack-starter/dashboard/client";

import type {
    ListAdminProductsQuery,
    ListAdminProductsQueryVariables,
    ProductFilters,
} from "@/graphql/generated/admin-types";
import type React from "react";

function getSelectValue(value: string) {
    return value || SELECT_EMPTY_VALUE;
}

function getFilterValue(value: string) {
    return value === SELECT_EMPTY_VALUE ? "" : value;
}

const LIST_ADMIN_PRODUCTS = gql`
    query listAdminProducts($where: ProductFilters, $limit: Int, $offset: Int) {
        listProducts(
            where: $where
            limit: $limit
            offset: $offset
            orderBy: { createdAt: { direction: desc, priority: 1 } }
        ) {
            id
            shopId
            name
            sku
            priceInCents
            inventoryCount
            status
            createdAt
            updatedAt
            shop {
                id
                name
                slug
            }
            orders {
                id
                orderNo
                status
            }
        }
    }
`;

type ProductItem = NonNullable<ListAdminProductsQuery["listProducts"]>[number];

const productColumns: DataTableColumn<ProductItem>[] = [
    {
        key: "id",
        header: "ID",
        render: (product) => product.id,
    },
    {
        key: "shopId",
        header: "Shop ID",
        render: (product) => product.shopId,
    },
    {
        key: "shop",
        header: "Shop",
        render: (product) => product.shop?.name ?? "-",
    },
    {
        key: "name",
        header: "Name",
        render: (product) => <span className="font-medium">{product.name}</span>,
    },
    {
        key: "sku",
        header: "SKU",
        render: (product) => product.sku,
    },
    {
        key: "priceInCents",
        header: "Price",
        render: (product) => <MoneyCell valueInCents={product.priceInCents} />,
    },
    {
        key: "inventoryCount",
        header: "Inventory",
        render: (product) => product.inventoryCount,
    },
    {
        key: "status",
        header: "Status",
        render: (product) => <StatusBadge status={product.status} />,
    },
    {
        key: "orders",
        header: "Orders",
        render: (product) => product.orders?.length ?? 0,
    },
    {
        key: "createdAt",
        header: "Created At",
        render: (product) => <DateTimeCell value={product.createdAt} />,
    },
    {
        key: "updatedAt",
        header: "Updated At",
        render: (product) => <DateTimeCell value={product.updatedAt} />,
    },
];

function parseIntegerFilter(value: string) {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
        return undefined;
    }

    const parsedValue = Number.parseInt(trimmedValue, 10);

    return Number.isNaN(parsedValue) ? undefined : parsedValue;
}

function buildProductFilters(
    shopId: string,
    sku: string,
    status: string
): ProductFilters | undefined {
    const where: ProductFilters = {};
    const parsedShopId = parseIntegerFilter(shopId);
    const trimmedSku = sku.trim();

    if (typeof parsedShopId === "number") {
        where.shopId = {
            eq: parsedShopId,
        };
    }

    if (trimmedSku) {
        where.sku = {
            like: `%${trimmedSku}%`,
        };
    }

    if (status) {
        where.status = {
            eq: status,
        };
    }

    return Object.keys(where).length > 0 ? where : undefined;
}

export function ProductListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const searchParamsKey = searchParams.toString();
    const { formKey, formRef, resetForm } = useResettableFilterForm(searchParamsKey);
    const filters = {
        shopId: searchParams.get("shopId") ?? "",
        sku: searchParams.get("sku") ?? "",
        status: searchParams.get("status") ?? "",
    };
    const page = parsePageParam(searchParams.get("page"));
    const pageSize = parsePageSizeParam(searchParams.get("pageSize"));
    const variables = useMemo<ListAdminProductsQueryVariables>(
        () => ({
            limit: pageSize,
            offset: (page - 1) * pageSize,
            where: buildProductFilters(filters.shopId, filters.sku, filters.status),
        }),
        [filters.shopId, filters.sku, filters.status, page, pageSize]
    );
    const { data, error, loading, refetch } = useDashboardQuery<
        ListAdminProductsQuery,
        ListAdminProductsQueryVariables
    >(LIST_ADMIN_PRODUCTS, variables);
    const products = data?.listProducts ?? [];

    function applyFilters(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const nextShopId = String(formData.get("shopId") ?? "").trim();
        const nextSku = String(formData.get("sku") ?? "").trim();
        const nextStatus = getFilterValue(String(formData.get("status") ?? ""));

        setSearchParams((currentParams) => {
            const nextParams = new URLSearchParams(currentParams);

            if (nextShopId) {
                nextParams.set("shopId", nextShopId);
            } else {
                nextParams.delete("shopId");
            }

            if (nextSku) {
                nextParams.set("sku", nextSku);
            } else {
                nextParams.delete("sku");
            }

            if (nextStatus) {
                nextParams.set("status", nextStatus);
            } else {
                nextParams.delete("status");
            }

            nextParams.set("page", "1");

            return nextParams;
        });
    }

    function resetFilters() {
        resetForm();

        setSearchParams((currentParams) => {
            const nextParams = new URLSearchParams(currentParams);
            nextParams.delete("shopId");
            nextParams.delete("sku");
            nextParams.delete("status");
            nextParams.set("page", "1");

            return nextParams;
        });
    }

    function changePage(nextPage: number) {
        setSearchParams((currentParams) => {
            const nextParams = new URLSearchParams(currentParams);
            nextParams.set("page", String(nextPage));

            return nextParams;
        });
    }

    function changePageSize(nextPageSize: number) {
        setSearchParams((currentParams) => {
            const nextParams = new URLSearchParams(currentParams);
            nextParams.set("page", "1");
            nextParams.set("pageSize", String(nextPageSize));

            return nextParams;
        });
    }

    return (
        <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="mt-1 text-2xl font-semibold tracking-normal">Product List</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        product 表字段、所属 shop 和订单数量。
                        {loading ? "" : `当前 ${products.length} 条记录。`}
                    </p>
                </div>
                <Button type="button" variant="outline" onClick={refetch} disabled={loading}>
                    <RefreshCwIcon />
                    Refresh
                </Button>
            </section>

            <form
                key={formKey}
                ref={formRef}
                className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3 rounded-lg border bg-background p-3 *:min-w-0"
                onSubmit={applyFilters}
            >
                <Input
                    aria-label="Shop ID"
                    inputMode="numeric"
                    name="shopId"
                    placeholder="Shop ID"
                    defaultValue={filters.shopId}
                />
                <Input
                    aria-label="SKU"
                    name="sku"
                    placeholder="SKU contains"
                    defaultValue={filters.sku}
                />
                <Select name="status" defaultValue={getSelectValue(filters.status)}>
                    <SelectTrigger aria-label="Status">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={SELECT_EMPTY_VALUE}>All status</SelectItem>
                        <SelectItem value="draft">draft</SelectItem>
                        <SelectItem value="active">active</SelectItem>
                        <SelectItem value="archived">archived</SelectItem>
                    </SelectContent>
                </Select>
                <Button type="submit" className="w-full">
                    <FilterIcon />
                    Filter
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={resetFilters}>
                    <RotateCcwIcon />
                    Reset
                </Button>
            </form>

            {error ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <DataTable
                columns={productColumns}
                emptyText={loading ? "Loading" : "No product records"}
                getRowKey={(product) => String(product.id)}
                items={products}
            />

            <TablePagination
                itemCount={products.length}
                loading={loading}
                onPageChange={changePage}
                onPageSizeChange={changePageSize}
                page={page}
                pageSize={pageSize}
            />
        </div>
    );
}

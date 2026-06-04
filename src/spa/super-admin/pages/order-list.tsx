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
    parsePageParam,
    parsePageSizeParam,
    StatusBadge,
    TablePagination,
    useSuperAdminQuery,
    type DataTableColumn,
} from "@shanjing/astro-full-stack-starter/super-admin/client";

import type {
    ListSuperAdminOrdersQuery,
    ListSuperAdminOrdersQueryVariables,
    OrderFilters,
} from "@/graphql/generated/super-admin-types";
import type React from "react";

const LIST_SUPER_ADMIN_ORDERS = gql`
    query listSuperAdminOrders($where: OrderFilters, $limit: Int, $offset: Int) {
        listOrders(
            where: $where
            limit: $limit
            offset: $offset
            orderBy: { createdAt: { direction: desc, priority: 1 } }
        ) {
            id
            shopId
            productId
            orderNo
            quantity
            unitPriceInCents
            totalAmountInCents
            status
            remark
            createdAt
            updatedAt
            shop {
                id
                name
                slug
            }
            product {
                id
                name
                sku
            }
        }
    }
`;

type OrderItem = NonNullable<ListSuperAdminOrdersQuery["listOrders"]>[number];

const orderColumns: DataTableColumn<OrderItem>[] = [
    {
        key: "id",
        header: "ID",
        render: (order) => order.id,
    },
    {
        key: "shopId",
        header: "Shop ID",
        render: (order) => order.shopId,
    },
    {
        key: "shop",
        header: "Shop",
        render: (order) => order.shop?.name ?? "-",
    },
    {
        key: "productId",
        header: "Product ID",
        render: (order) => order.productId,
    },
    {
        key: "product",
        header: "Product",
        render: (order) => order.product?.name ?? "-",
    },
    {
        key: "orderNo",
        header: "Order No",
        render: (order) => <span className="font-medium">{order.orderNo}</span>,
    },
    {
        key: "quantity",
        header: "Quantity",
        render: (order) => order.quantity,
    },
    {
        key: "unitPriceInCents",
        header: "Unit Price",
        render: (order) => <MoneyCell valueInCents={order.unitPriceInCents} />,
    },
    {
        key: "totalAmountInCents",
        header: "Total",
        render: (order) => <MoneyCell valueInCents={order.totalAmountInCents} />,
    },
    {
        key: "status",
        header: "Status",
        render: (order) => <StatusBadge status={order.status} />,
    },
    {
        key: "remark",
        header: "Remark",
        className: "max-w-72 whitespace-normal",
        render: (order) => order.remark ?? "-",
    },
    {
        key: "createdAt",
        header: "Created At",
        render: (order) => <DateTimeCell value={order.createdAt} />,
    },
    {
        key: "updatedAt",
        header: "Updated At",
        render: (order) => <DateTimeCell value={order.updatedAt} />,
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

function buildOrderFilters(
    shopId: string,
    productId: string,
    orderNo: string,
    status: string
): OrderFilters | undefined {
    const where: OrderFilters = {};
    const parsedShopId = parseIntegerFilter(shopId);
    const parsedProductId = parseIntegerFilter(productId);
    const trimmedOrderNo = orderNo.trim();

    if (typeof parsedShopId === "number") {
        where.shopId = {
            eq: parsedShopId,
        };
    }

    if (typeof parsedProductId === "number") {
        where.productId = {
            eq: parsedProductId,
        };
    }

    if (trimmedOrderNo) {
        where.orderNo = {
            like: `%${trimmedOrderNo}%`,
        };
    }

    if (status) {
        where.status = {
            eq: status,
        };
    }

    return Object.keys(where).length > 0 ? where : undefined;
}

export function OrderListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const searchParamsKey = searchParams.toString();
    const filters = {
        shopId: searchParams.get("shopId") ?? "",
        productId: searchParams.get("productId") ?? "",
        orderNo: searchParams.get("orderNo") ?? "",
        status: searchParams.get("status") ?? "",
    };
    const page = parsePageParam(searchParams.get("page"));
    const pageSize = parsePageSizeParam(searchParams.get("pageSize"));
    const variables = useMemo<ListSuperAdminOrdersQueryVariables>(
        () => ({
            limit: pageSize,
            offset: (page - 1) * pageSize,
            where: buildOrderFilters(
                filters.shopId,
                filters.productId,
                filters.orderNo,
                filters.status
            ),
        }),
        [filters.orderNo, filters.productId, filters.shopId, filters.status, page, pageSize]
    );
    const { data, error, loading, refetch } = useSuperAdminQuery<
        ListSuperAdminOrdersQuery,
        ListSuperAdminOrdersQueryVariables
    >(LIST_SUPER_ADMIN_ORDERS, variables);
    const orders = data?.listOrders ?? [];

    function applyFilters(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const nextShopId = String(formData.get("shopId") ?? "").trim();
        const nextProductId = String(formData.get("productId") ?? "").trim();
        const nextOrderNo = String(formData.get("orderNo") ?? "").trim();
        const nextStatus = String(formData.get("status") ?? "");

        setSearchParams((currentParams) => {
            const nextParams = new URLSearchParams(currentParams);

            if (nextShopId) {
                nextParams.set("shopId", nextShopId);
            } else {
                nextParams.delete("shopId");
            }

            if (nextProductId) {
                nextParams.set("productId", nextProductId);
            } else {
                nextParams.delete("productId");
            }

            if (nextOrderNo) {
                nextParams.set("orderNo", nextOrderNo);
            } else {
                nextParams.delete("orderNo");
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
        setSearchParams((currentParams) => {
            const nextParams = new URLSearchParams(currentParams);
            nextParams.delete("shopId");
            nextParams.delete("productId");
            nextParams.delete("orderNo");
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
                    <h1 className="mt-2 text-3xl font-semibold tracking-normal">Order List</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        order 表字段、所属 shop 和关联 product。
                        {loading ? "" : `当前 ${orders.length} 条记录。`}
                    </p>
                </div>
                <Button type="button" variant="outline" onClick={refetch} disabled={loading}>
                    <RefreshCwIcon />
                    Refresh
                </Button>
            </section>

            <form
                key={searchParamsKey}
                className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3 rounded-lg border bg-background p-3 *:min-w-0"
                onSubmit={applyFilters}
            >
                <Input
                    aria-label="Filter by shop id"
                    inputMode="numeric"
                    name="shopId"
                    placeholder="Shop ID"
                    defaultValue={filters.shopId}
                />
                <Input
                    aria-label="Filter by product id"
                    inputMode="numeric"
                    name="productId"
                    placeholder="Product ID"
                    defaultValue={filters.productId}
                />
                <Input
                    aria-label="Filter by order no"
                    name="orderNo"
                    placeholder="Order no contains"
                    defaultValue={filters.orderNo}
                />
                <select
                    aria-label="Filter by status"
                    className="h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    name="status"
                    defaultValue={filters.status}
                >
                    <option value="">All status</option>
                    <option value="pending">pending</option>
                    <option value="paid">paid</option>
                    <option value="shipped">shipped</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                </select>
                <Button type="submit" variant="secondary" className="w-full">
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
                columns={orderColumns}
                emptyText={loading ? "Loading" : "No order records"}
                getRowKey={(order) => String(order.id)}
                items={orders}
            />

            <TablePagination
                itemCount={orders.length}
                loading={loading}
                onPageChange={changePage}
                onPageSizeChange={changePageSize}
                page={page}
                pageSize={pageSize}
            />
        </div>
    );
}

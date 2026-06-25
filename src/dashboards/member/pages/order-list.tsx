import { gql } from "@apollo/client/core";
import { RefreshCwIcon } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import {
    DataTable,
    DateTimeCell,
    MoneyCell,
    parsePageParam,
    parsePageSizeParam,
    StatusBadge,
    TablePagination,
    useDashboardQuery,
    type DataTableColumn,
} from "@shanjing/astro-full-stack-starter/dashboard/client";

import type {
    ListMemberOrdersQuery,
    ListMemberOrdersQueryVariables,
} from "@/graphql/generated/member-types";

const LIST_MEMBER_ORDERS = gql`
    query listMemberOrders($limit: Int, $offset: Int) {
        listOrders(
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

type OrderItem = NonNullable<ListMemberOrdersQuery["listOrders"]>[number];

const orderColumns: DataTableColumn<OrderItem>[] = [
    {
        key: "id",
        header: "ID",
        render: (order) => order.id,
    },
    {
        key: "shop",
        header: "Shop",
        render: (order) => order.shop?.name ?? "-",
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

export function MemberOrderListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const page = parsePageParam(searchParams.get("page"));
    const pageSize = parsePageSizeParam(searchParams.get("pageSize"));
    const variables = useMemo<ListMemberOrdersQueryVariables>(
        () => ({
            limit: pageSize,
            offset: (page - 1) * pageSize,
        }),
        [page, pageSize]
    );
    const { data, error, loading, refetch } = useDashboardQuery<
        ListMemberOrdersQuery,
        ListMemberOrdersQueryVariables
    >(LIST_MEMBER_ORDERS, variables);
    const orders = data?.listOrders ?? [];

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
                    <h1 className="mt-1 text-2xl font-semibold tracking-normal">Order List</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        会员可查看的订单列表。{loading ? "" : `当前 ${orders.length} 条记录。`}
                    </p>
                </div>
                <Button type="button" variant="outline" onClick={refetch} disabled={loading}>
                    <RefreshCwIcon />
                    Refresh
                </Button>
            </section>

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

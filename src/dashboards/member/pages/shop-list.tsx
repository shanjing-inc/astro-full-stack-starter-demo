import { gql } from "@apollo/client/core";
import { RefreshCwIcon } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import {
    DataTable,
    DateTimeCell,
    parsePageParam,
    parsePageSizeParam,
    StatusBadge,
    TablePagination,
    useDashboardQuery,
    type DataTableColumn,
} from "@shanjing/astro-full-stack-starter/dashboard/client";

import type {
    ListMemberShopsQuery,
    ListMemberShopsQueryVariables,
} from "@/graphql/generated/member-types";

const LIST_MEMBER_SHOPS = gql`
    query listMemberShops($limit: Int, $offset: Int) {
        listShops(
            limit: $limit
            offset: $offset
            orderBy: { createdAt: { direction: desc, priority: 1 } }
        ) {
            id
            name
            slug
            status
            createdAt
            updatedAt
            products {
                id
                name
            }
            orders {
                id
                orderNo
            }
        }
    }
`;

type ShopItem = NonNullable<ListMemberShopsQuery["listShops"]>[number];

const shopColumns: DataTableColumn<ShopItem>[] = [
    {
        key: "id",
        header: "ID",
        render: (shop) => shop.id,
    },
    {
        key: "name",
        header: "Name",
        render: (shop) => <span className="font-medium">{shop.name}</span>,
    },
    {
        key: "slug",
        header: "Slug",
        render: (shop) => shop.slug,
    },
    {
        key: "status",
        header: "Status",
        render: (shop) => <StatusBadge status={shop.status} />,
    },
    {
        key: "products",
        header: "Products",
        render: (shop) => shop.products?.length ?? 0,
    },
    {
        key: "orders",
        header: "Orders",
        render: (shop) => shop.orders?.length ?? 0,
    },
    {
        key: "createdAt",
        header: "Created At",
        render: (shop) => <DateTimeCell value={shop.createdAt} />,
    },
    {
        key: "updatedAt",
        header: "Updated At",
        render: (shop) => <DateTimeCell value={shop.updatedAt} />,
    },
];

export function MemberShopListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const page = parsePageParam(searchParams.get("page"));
    const pageSize = parsePageSizeParam(searchParams.get("pageSize"));
    const variables = useMemo<ListMemberShopsQueryVariables>(
        () => ({
            limit: pageSize,
            offset: (page - 1) * pageSize,
        }),
        [page, pageSize]
    );
    const { data, error, loading, refetch } = useDashboardQuery<
        ListMemberShopsQuery,
        ListMemberShopsQueryVariables
    >(LIST_MEMBER_SHOPS, variables);
    const shops = data?.listShops ?? [];

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
                    <h1 className="mt-1 text-2xl font-semibold tracking-normal">Shop List</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        会员可查看的店铺列表。{loading ? "" : `当前 ${shops.length} 条记录。`}
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
                columns={shopColumns}
                emptyText={loading ? "Loading" : "No shop records"}
                getRowKey={(shop) => String(shop.id)}
                items={shops}
            />

            <TablePagination
                itemCount={shops.length}
                loading={loading}
                onPageChange={changePage}
                onPageSizeChange={changePageSize}
                page={page}
                pageSize={pageSize}
            />
        </div>
    );
}

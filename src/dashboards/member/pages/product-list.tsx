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
    ListMemberProductsQuery,
    ListMemberProductsQueryVariables,
} from "@/graphql/generated/member-types";

const LIST_MEMBER_PRODUCTS = gql`
    query listMemberProducts($limit: Int, $offset: Int) {
        listProducts(
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
            }
        }
    }
`;

type ProductItem = NonNullable<ListMemberProductsQuery["listProducts"]>[number];

const productColumns: DataTableColumn<ProductItem>[] = [
    {
        key: "id",
        header: "ID",
        render: (product) => product.id,
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

export function MemberProductListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const page = parsePageParam(searchParams.get("page"));
    const pageSize = parsePageSizeParam(searchParams.get("pageSize"));
    const variables = useMemo<ListMemberProductsQueryVariables>(
        () => ({
            limit: pageSize,
            offset: (page - 1) * pageSize,
        }),
        [page, pageSize]
    );
    const { data, error, loading, refetch } = useDashboardQuery<
        ListMemberProductsQuery,
        ListMemberProductsQueryVariables
    >(LIST_MEMBER_PRODUCTS, variables);
    const products = data?.listProducts ?? [];

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
                        会员可查看的商品列表。{loading ? "" : `当前 ${products.length} 条记录。`}
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

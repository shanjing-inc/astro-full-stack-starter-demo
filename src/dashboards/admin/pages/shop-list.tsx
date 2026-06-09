import { gql } from "@apollo/client/core";
import { FilterIcon, RefreshCwIcon, RotateCcwIcon } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    ListAdminShopsQuery,
    ListAdminShopsQueryVariables,
    ShopFilters,
} from "@/graphql/generated/admin-types";
import type React from "react";

const LIST_ADMIN_SHOPS = gql`
    query listAdminShops($where: ShopFilters, $limit: Int, $offset: Int) {
        listShops(
            where: $where
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
                sku
            }
            orders {
                id
                orderNo
                status
            }
        }
    }
`;

type ShopItem = NonNullable<ListAdminShopsQuery["listShops"]>[number];

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

function buildShopFilters(slug: string, status: string): ShopFilters | undefined {
    const where: ShopFilters = {};
    const trimmedSlug = slug.trim();

    if (trimmedSlug) {
        where.slug = {
            like: `%${trimmedSlug}%`,
        };
    }

    if (status) {
        where.status = {
            eq: status,
        };
    }

    return Object.keys(where).length > 0 ? where : undefined;
}

export function ShopListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const searchParamsKey = searchParams.toString();
    const filters = {
        slug: searchParams.get("slug") ?? "",
        status: searchParams.get("status") ?? "",
    };
    const page = parsePageParam(searchParams.get("page"));
    const pageSize = parsePageSizeParam(searchParams.get("pageSize"));
    const variables = useMemo<ListAdminShopsQueryVariables>(
        () => ({
            limit: pageSize,
            offset: (page - 1) * pageSize,
            where: buildShopFilters(filters.slug, filters.status),
        }),
        [filters.slug, filters.status, page, pageSize]
    );
    const { data, error, loading, refetch } = useDashboardQuery<
        ListAdminShopsQuery,
        ListAdminShopsQueryVariables
    >(LIST_ADMIN_SHOPS, variables);
    const shops = data?.listShops ?? [];

    function applyFilters(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const nextSlug = String(formData.get("slug") ?? "").trim();
        const nextStatus = String(formData.get("status") ?? "");

        setSearchParams((currentParams) => {
            const nextParams = new URLSearchParams(currentParams);

            if (nextSlug) {
                nextParams.set("slug", nextSlug);
            } else {
                nextParams.delete("slug");
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
            nextParams.delete("slug");
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
                    <h1 className="mt-2 text-3xl font-semibold tracking-normal">Shop List</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        shop 表字段和关联数量。{loading ? "" : `当前 ${shops.length} 条记录。`}
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
                    aria-label="Filter by slug"
                    name="slug"
                    placeholder="Slug contains"
                    defaultValue={filters.slug}
                />
                <select
                    aria-label="Filter by status"
                    className="h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    name="status"
                    defaultValue={filters.status}
                >
                    <option value="">All status</option>
                    <option value="draft">draft</option>
                    <option value="active">active</option>
                    <option value="archived">archived</option>
                </select>
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

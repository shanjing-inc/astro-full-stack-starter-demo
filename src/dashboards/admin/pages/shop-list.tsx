import { gql } from "@apollo/client/core";
import { EyeIcon, FilterIcon, RefreshCwIcon, RotateCcwIcon, SaveIcon } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DataTable,
    DateTimeCell,
    SELECT_EMPTY_VALUE,
    parsePageParam,
    parsePageSizeParam,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    StatusBadge,
    TablePagination,
    executeDashboardGraphQL,
    useDashboardQuery,
    useResettableFilterForm,
    type DataTableColumn,
} from "@shanjing/astro-full-stack-starter/dashboard/client";

import type {
    ListAdminShopsQuery,
    ListAdminShopsQueryVariables,
    ShopFilters,
    UpdateAdminShopMutation,
    UpdateAdminShopMutationVariables,
} from "@/graphql/generated/admin-types";

function getSelectValue(value: string) {
    return value || SELECT_EMPTY_VALUE;
}

function getFilterValue(value: string) {
    return value === SELECT_EMPTY_VALUE ? "" : value;
}

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

const UPDATE_ADMIN_SHOP = gql`
    mutation updateAdminShop($set: UpdateShopSetInput!, $where: ShopFilters!) {
        updateShop(set: $set, where: $where) {
            id
            name
            slug
            status
            updatedAt
        }
    }
`;

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

function parseGraphqlId(value: null | number | string | undefined) {
    const parsedValue = Number.parseInt(String(value ?? ""), 10);

    return Number.isNaN(parsedValue) ? undefined : parsedValue;
}

function readTextField(formData: FormData, name: string) {
    return String(formData.get(name) ?? "").trim();
}

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
    const [actionError, setActionError] = useState<string | null>(null);
    const [pendingShopId, setPendingShopId] = useState<string | null>(null);
    const [selectedShop, setSelectedShop] = useState<ShopItem | null>(null);
    const searchParamsKey = searchParams.toString();
    const { formKey, formRef, resetForm } = useResettableFilterForm(searchParamsKey);
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
    const selectedShopId = String(selectedShop?.id ?? "");
    const savingSelectedShop = pendingShopId === selectedShopId;

    function openShopDetails(shop: ShopItem) {
        setActionError(null);
        setSelectedShop(shop);
    }

    function closeShopDetails() {
        if (savingSelectedShop) {
            return;
        }

        setActionError(null);
        setSelectedShop(null);
    }

    async function saveShopDetails(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!selectedShop) {
            return;
        }

        const shopId = parseGraphqlId(selectedShop.id);

        if (shopId === undefined) {
            setActionError("Shop id is invalid.");
            return;
        }

        const formData = new FormData(event.currentTarget);
        const nextName = readTextField(formData, "name");
        const nextSlug = readTextField(formData, "slug");
        const nextStatus = readTextField(formData, "status");

        if (!nextName || !nextSlug || !nextStatus) {
            setActionError("Name, slug and status are required.");
            return;
        }

        setActionError(null);
        setPendingShopId(selectedShopId);

        try {
            await executeDashboardGraphQL<
                UpdateAdminShopMutation,
                UpdateAdminShopMutationVariables
            >(UPDATE_ADMIN_SHOP, {
                set: {
                    name: nextName,
                    slug: nextSlug,
                    status: nextStatus,
                },
                where: {
                    id: {
                        eq: shopId,
                    },
                },
            });
            setSelectedShop(null);
            refetch();
        } catch (error) {
            setActionError(error instanceof Error ? error.message : "Shop update failed.");
        } finally {
            setPendingShopId(null);
        }
    }

    function applyFilters(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const nextSlug = String(formData.get("slug") ?? "").trim();
        const nextStatus = getFilterValue(String(formData.get("status") ?? ""));

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
        resetForm();

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

    const columns: DataTableColumn<ShopItem>[] = [
        ...shopColumns,
        {
            key: "actions",
            header: "Actions",
            render: (shop) => {
                const shopId = String(shop.id ?? "");
                const pending = pendingShopId === shopId;

                return (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => openShopDetails(shop)}
                    >
                        <EyeIcon />
                        View details
                    </Button>
                );
            },
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="mt-1 text-2xl font-semibold tracking-normal">Shop List</h1>
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
                key={formKey}
                ref={formRef}
                className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3 rounded-lg border bg-background p-3 *:min-w-0"
                onSubmit={applyFilters}
            >
                <Input
                    aria-label="Slug"
                    name="slug"
                    placeholder="Slug contains"
                    defaultValue={filters.slug}
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
                columns={columns}
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

            <Sheet
                open={selectedShop !== null}
                onOpenChange={(open: boolean) => {
                    if (!open) {
                        closeShopDetails();
                    }
                }}
            >
                <SheetContent className="sm:max-w-xl">
                    {selectedShop ? (
                        <>
                            <SheetHeader>
                                <SheetTitle>{selectedShop.name ?? "Shop details"}</SheetTitle>
                                <SheetDescription>
                                    Shop ID {selectedShop.id ?? "-"} 的字段、关联数量和编辑表单。
                                </SheetDescription>
                            </SheetHeader>
                            <form
                                key={selectedShopId}
                                className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4"
                                onSubmit={saveShopDetails}
                            >
                                <dl className="grid gap-3 rounded-lg border bg-background p-3 text-sm sm:grid-cols-2">
                                    <div className="min-w-0">
                                        <dt className="text-xs text-muted-foreground">ID</dt>
                                        <dd className="truncate font-medium">
                                            {selectedShop.id ?? "-"}
                                        </dd>
                                    </div>
                                    <div className="min-w-0">
                                        <dt className="text-xs text-muted-foreground">Status</dt>
                                        <dd>
                                            <StatusBadge status={selectedShop.status ?? "-"} />
                                        </dd>
                                    </div>
                                    <div className="min-w-0">
                                        <dt className="text-xs text-muted-foreground">Slug</dt>
                                        <dd className="truncate font-medium">
                                            {selectedShop.slug ?? "-"}
                                        </dd>
                                    </div>
                                    <div className="min-w-0">
                                        <dt className="text-xs text-muted-foreground">Products</dt>
                                        <dd className="font-medium">
                                            {selectedShop.products?.length ?? 0}
                                        </dd>
                                    </div>
                                    <div className="min-w-0">
                                        <dt className="text-xs text-muted-foreground">Orders</dt>
                                        <dd className="font-medium">
                                            {selectedShop.orders?.length ?? 0}
                                        </dd>
                                    </div>
                                    <div className="min-w-0">
                                        <dt className="text-xs text-muted-foreground">
                                            Created At
                                        </dt>
                                        <dd className="font-medium">
                                            {selectedShop.createdAt ? (
                                                <DateTimeCell value={selectedShop.createdAt} />
                                            ) : (
                                                "-"
                                            )}
                                        </dd>
                                    </div>
                                    <div className="min-w-0">
                                        <dt className="text-xs text-muted-foreground">
                                            Updated At
                                        </dt>
                                        <dd className="font-medium">
                                            {selectedShop.updatedAt ? (
                                                <DateTimeCell value={selectedShop.updatedAt} />
                                            ) : (
                                                "-"
                                            )}
                                        </dd>
                                    </div>
                                </dl>

                                {actionError ? (
                                    <div
                                        role="alert"
                                        className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                                    >
                                        {actionError}
                                    </div>
                                ) : null}

                                <div className="grid gap-3">
                                    <label
                                        htmlFor="shop-detail-name"
                                        className="text-sm font-medium"
                                    >
                                        Name
                                    </label>
                                    <Input
                                        id="shop-detail-name"
                                        name="name"
                                        defaultValue={selectedShop.name ?? ""}
                                        disabled={savingSelectedShop}
                                    />
                                    <label
                                        htmlFor="shop-detail-slug"
                                        className="text-sm font-medium"
                                    >
                                        Slug
                                    </label>
                                    <Input
                                        id="shop-detail-slug"
                                        name="slug"
                                        defaultValue={selectedShop.slug ?? ""}
                                        disabled={savingSelectedShop}
                                    />
                                    <div className="grid gap-1.5 text-sm font-medium">
                                        <label htmlFor="shop-detail-status">Status</label>
                                        <Select
                                            name="status"
                                            defaultValue={selectedShop.status ?? "draft"}
                                            disabled={savingSelectedShop}
                                        >
                                            <SelectTrigger
                                                id="shop-detail-status"
                                                aria-label="Shop status"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="draft">draft</SelectItem>
                                                <SelectItem value="active">active</SelectItem>
                                                <SelectItem value="archived">archived</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <SheetFooter className="flex-row justify-end gap-2 p-0">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={savingSelectedShop}
                                        onClick={closeShopDetails}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={savingSelectedShop}>
                                        <SaveIcon />
                                        Save changes
                                    </Button>
                                </SheetFooter>
                            </form>
                        </>
                    ) : null}
                </SheetContent>
            </Sheet>
        </div>
    );
}

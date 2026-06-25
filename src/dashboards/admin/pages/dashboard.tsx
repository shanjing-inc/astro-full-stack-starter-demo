import { gql } from "@apollo/client/core";
import { RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DateTimeCell,
    MoneyCell,
    StatusBadge,
    useDashboardQuery,
} from "@shanjing/astro-full-stack-starter/dashboard/client";

import type { GetAdminDashboardQuery } from "@/graphql/generated/admin-types";

const GET_ADMIN_DASHBOARD = gql`
    query getAdminDashboard {
        listShops(orderBy: { createdAt: { direction: desc, priority: 1 } }) {
            id
            name
            status
            createdAt
        }
        listProducts(orderBy: { createdAt: { direction: desc, priority: 1 } }) {
            id
            name
            status
            inventoryCount
            createdAt
        }
        listOrders(orderBy: { createdAt: { direction: desc, priority: 1 } }) {
            id
            orderNo
            status
            totalAmountInCents
            createdAt
        }
    }
`;

function countByStatus(items: readonly { status?: null | string }[]) {
    return items.reduce<Record<string, number>>((counts, item) => {
        const status = item.status ?? "unknown";
        counts[status] = (counts[status] ?? 0) + 1;

        return counts;
    }, {});
}

function DashboardMetricCard({
    detail,
    label,
    value,
}: {
    detail: string;
    label: string;
    value: number;
}) {
    return (
        <Card className="border-border/80">
            <CardHeader className="pb-2">
                <p className="text-sm text-muted-foreground">{label}</p>
                <CardTitle className="text-3xl">{value}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{detail}</CardContent>
        </Card>
    );
}

function StatusSummary({ counts }: { counts: Record<string, number> }) {
    const entries = Object.entries(counts);

    return (
        <div className="flex flex-wrap gap-2">
            {entries.length > 0 ? (
                entries.map(([status, count]) => (
                    <div key={status} className="inline-flex items-center gap-2">
                        <StatusBadge status={status} />
                        <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                ))
            ) : (
                <span className="text-sm text-muted-foreground">No records</span>
            )}
        </div>
    );
}

export function DashboardPage() {
    const { data, error, loading, refetch } =
        useDashboardQuery<GetAdminDashboardQuery>(GET_ADMIN_DASHBOARD);
    const shops = data?.listShops ?? [];
    const products = data?.listProducts ?? [];
    const orders = data?.listOrders ?? [];
    const latestOrder = orders[0];

    return (
        <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="mt-1 text-2xl font-semibold tracking-normal">Admin</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        Shop、Product、Order 数据概览。
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

            <section className="grid gap-4 md:grid-cols-3">
                <DashboardMetricCard
                    label="Shops"
                    value={shops.length}
                    detail={loading ? "Loading" : "Total shop records"}
                />
                <DashboardMetricCard
                    label="Products"
                    value={products.length}
                    detail={loading ? "Loading" : "Total product records"}
                />
                <DashboardMetricCard
                    label="Orders"
                    value={orders.length}
                    detail={loading ? "Loading" : "Total order records"}
                />
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
                <Card className="border-border/80">
                    <CardHeader>
                        <CardTitle className="text-xl">Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-5 md:grid-cols-3">
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Shop</p>
                            <StatusSummary counts={countByStatus(shops)} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Product</p>
                            <StatusSummary counts={countByStatus(products)} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Order</p>
                            <StatusSummary counts={countByStatus(orders)} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/80">
                    <CardHeader>
                        <CardTitle className="text-xl">Latest Order</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        {latestOrder ? (
                            <>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">Order No</span>
                                    <span className="font-medium">{latestOrder.orderNo}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">Status</span>
                                    <StatusBadge status={latestOrder.status} />
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">Amount</span>
                                    <MoneyCell valueInCents={latestOrder.totalAmountInCents} />
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">Created</span>
                                    <DateTimeCell value={latestOrder.createdAt} />
                                </div>
                            </>
                        ) : (
                            <span className="text-muted-foreground">
                                {loading ? "Loading" : "No records"}
                            </span>
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}

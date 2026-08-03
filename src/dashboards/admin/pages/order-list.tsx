import { gql } from "@apollo/client/core";
import { CalendarIcon, FilterIcon, RefreshCwIcon, RotateCcwIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Calendar,
    DataTable,
    DateTimeCell,
    MoneyCell,
    Popover,
    PopoverContent,
    PopoverTrigger,
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

import type { DateTimeFilters } from "@shanjing/astro-full-stack-starter/graphql/generated/dashboard";

import type {
    ListAdminOrdersQuery,
    ListAdminOrdersQueryVariables,
    OrderFilters,
} from "@/graphql/generated/admin-types";
import type React from "react";

function getSelectValue(value: string) {
    return value || SELECT_EMPTY_VALUE;
}

function getFilterValue(value: string) {
    return value === SELECT_EMPTY_VALUE ? "" : value;
}

const LIST_ADMIN_ORDERS = gql`
    query listAdminOrders($where: OrderFilters, $limit: Int, $offset: Int) {
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

type OrderItem = NonNullable<ListAdminOrdersQuery["listOrders"]>[number];
type CreatedAtRangeFilter = [string, string];

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

function parseDateFilter(value: string) {
    const trimmedValue = value.trim();
    const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/u;
    const match = datePattern.exec(trimmedValue);

    if (!match) {
        return undefined;
    }

    const year = Number.parseInt(match[1] ?? "", 10);
    const month = Number.parseInt(match[2] ?? "", 10);
    const day = Number.parseInt(match[3] ?? "", 10);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return undefined;
    }

    return date;
}

function serializeDateFilter(value: Date) {
    return value.toISOString();
}

function formatDateValue(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseCalendarDateValue(value: string) {
    const trimmedValue = value.trim();
    const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/u;
    const match = datePattern.exec(trimmedValue);

    if (!match) {
        return undefined;
    }

    const year = Number.parseInt(match[1] ?? "", 10);
    const month = Number.parseInt(match[2] ?? "", 10);
    const day = Number.parseInt(match[3] ?? "", 10);
    const date = new Date(year, month - 1, day);

    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return undefined;
    }

    return date;
}

function parseCreatedAtRangeSearchParam(value: null | string): CreatedAtRangeFilter {
    if (!value) {
        return ["", ""];
    }

    try {
        const parsedValue: unknown = JSON.parse(value);

        if (
            Array.isArray(parsedValue) &&
            typeof parsedValue[0] === "string" &&
            typeof parsedValue[1] === "string"
        ) {
            return [parsedValue[0].trim(), parsedValue[1].trim()];
        }
    } catch {
        return ["", ""];
    }

    return ["", ""];
}

function serializeCreatedAtRangeSearchParam(value: CreatedAtRangeFilter) {
    const nextValue: CreatedAtRangeFilter = [value[0].trim(), value[1].trim()];

    return nextValue[0] || nextValue[1] ? JSON.stringify(nextValue) : "";
}

function parseDateToExclusiveFilter(value: string) {
    const date = parseDateFilter(value);

    if (!date) {
        return undefined;
    }

    date.setUTCDate(date.getUTCDate() + 1);

    return date;
}

function buildOrderFilters(
    shopId: string,
    productId: string,
    orderNo: string,
    status: string,
    createdAtRange: CreatedAtRangeFilter
): OrderFilters | undefined {
    const where: OrderFilters = {};
    const parsedShopId = parseIntegerFilter(shopId);
    const parsedProductId = parseIntegerFilter(productId);
    const trimmedOrderNo = orderNo.trim();
    const [createdAtFrom, createdAtTo] = createdAtRange;
    const parsedCreatedAtFrom = parseDateFilter(createdAtFrom);
    const parsedCreatedAtTo = parseDateToExclusiveFilter(createdAtTo);

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

    if (parsedCreatedAtFrom || parsedCreatedAtTo) {
        const createdAt: DateTimeFilters = {};

        if (parsedCreatedAtFrom) {
            createdAt.gte = serializeDateFilter(parsedCreatedAtFrom);
        }

        if (parsedCreatedAtTo) {
            createdAt.lt = serializeDateFilter(parsedCreatedAtTo);
        }

        where.createdAt = createdAt;
    }

    return Object.keys(where).length > 0 ? where : undefined;
}

function CreatedAtRangePicker({ value }: { value: CreatedAtRangeFilter }) {
    const [selectedRange, setSelectedRange] = useState(() => ({
        from: parseCalendarDateValue(value[0]),
        to: parseCalendarDateValue(value[1]),
    }));
    const rangeValue: CreatedAtRangeFilter = [
        selectedRange.from ? formatDateValue(selectedRange.from) : "",
        selectedRange.to ? formatDateValue(selectedRange.to) : "",
    ];
    const serializedRange = serializeCreatedAtRangeSearchParam(rangeValue);
    const buttonLabel =
        rangeValue[0] && rangeValue[1]
            ? `${rangeValue[0]} - ${rangeValue[1]}`
            : rangeValue[0]
              ? `${rangeValue[0]} -`
              : rangeValue[1]
                ? `- ${rangeValue[1]}`
                : "Created date range";

    return (
        <div className="min-w-0">
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        aria-label="Created at range"
                        className="w-full justify-start text-left font-normal"
                        type="button"
                        variant="outline"
                    >
                        <CalendarIcon />
                        <span className="truncate">{buttonLabel}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                        defaultMonth={selectedRange.from ?? selectedRange.to}
                        mode="range"
                        numberOfMonths={2}
                        onSelect={(nextRange) =>
                            setSelectedRange({
                                from: nextRange?.from,
                                to: nextRange?.to,
                            })
                        }
                        selected={selectedRange}
                    />
                </PopoverContent>
            </Popover>
            <input name="createdAtRange" type="hidden" value={serializedRange} />
        </div>
    );
}

export function OrderListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const searchParamsKey = searchParams.toString();
    const { formKey, formRef, resetForm } = useResettableFilterForm(searchParamsKey);
    const filters = {
        shopId: searchParams.get("shopId") ?? "",
        productId: searchParams.get("productId") ?? "",
        orderNo: searchParams.get("orderNo") ?? "",
        status: searchParams.get("status") ?? "",
        createdAtRange: parseCreatedAtRangeSearchParam(searchParams.get("createdAtRange")),
    };
    const [createdAtRangeFrom, createdAtRangeTo] = filters.createdAtRange;
    const page = parsePageParam(searchParams.get("page"));
    const pageSize = parsePageSizeParam(searchParams.get("pageSize"));
    const variables = useMemo<ListAdminOrdersQueryVariables>(
        () => ({
            limit: pageSize,
            offset: (page - 1) * pageSize,
            where: buildOrderFilters(
                filters.shopId,
                filters.productId,
                filters.orderNo,
                filters.status,
                [createdAtRangeFrom, createdAtRangeTo]
            ),
        }),
        [
            createdAtRangeFrom,
            createdAtRangeTo,
            filters.orderNo,
            filters.productId,
            filters.shopId,
            filters.status,
            page,
            pageSize,
        ]
    );
    const { data, error, loading, refetch } = useDashboardQuery<
        ListAdminOrdersQuery,
        ListAdminOrdersQueryVariables
    >(LIST_ADMIN_ORDERS, variables);
    const orders = data?.listOrders ?? [];

    function applyFilters(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const nextShopId = String(formData.get("shopId") ?? "").trim();
        const nextProductId = String(formData.get("productId") ?? "").trim();
        const nextOrderNo = String(formData.get("orderNo") ?? "").trim();
        const nextStatus = getFilterValue(String(formData.get("status") ?? ""));
        const nextCreatedAtRange = String(formData.get("createdAtRange") ?? "").trim();

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

            if (nextCreatedAtRange) {
                nextParams.set("createdAtRange", nextCreatedAtRange);
            } else {
                nextParams.delete("createdAtRange");
            }

            nextParams.delete("createdAtFrom");
            nextParams.delete("createdAtTo");
            nextParams.set("page", "1");

            return nextParams;
        });
    }

    function resetFilters() {
        resetForm();

        setSearchParams((currentParams) => {
            const nextParams = new URLSearchParams(currentParams);
            nextParams.delete("shopId");
            nextParams.delete("productId");
            nextParams.delete("orderNo");
            nextParams.delete("status");
            nextParams.delete("createdAtRange");
            nextParams.delete("createdAtFrom");
            nextParams.delete("createdAtTo");
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
                    <h1 className="mt-1 text-2xl font-semibold tracking-normal">Order List</h1>
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
                    aria-label="Product ID"
                    inputMode="numeric"
                    name="productId"
                    placeholder="Product ID"
                    defaultValue={filters.productId}
                />
                <Input
                    aria-label="Order no"
                    name="orderNo"
                    placeholder="Order no contains"
                    defaultValue={filters.orderNo}
                />
                <Select name="status" defaultValue={getSelectValue(filters.status)}>
                    <SelectTrigger aria-label="Status">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={SELECT_EMPTY_VALUE}>All status</SelectItem>
                        <SelectItem value="pending">pending</SelectItem>
                        <SelectItem value="paid">paid</SelectItem>
                        <SelectItem value="shipped">shipped</SelectItem>
                        <SelectItem value="completed">completed</SelectItem>
                        <SelectItem value="cancelled">cancelled</SelectItem>
                    </SelectContent>
                </Select>
                <CreatedAtRangePicker
                    key={formKey}
                    value={[createdAtRangeFrom, createdAtRangeTo]}
                />
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

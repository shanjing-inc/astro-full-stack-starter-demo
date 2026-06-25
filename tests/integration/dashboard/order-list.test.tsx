// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
});

const { useDashboardQueryMock } = vi.hoisted(() => ({
    useDashboardQueryMock: vi.fn(() => ({
        data: {
            listOrders: [],
        },
        error: undefined,
        loading: false,
        refetch: vi.fn(),
    })),
}));

vi.mock("@shanjing/astro-full-stack-starter/dashboard/client", () => ({
    Calendar: ({ onSelect }: { onSelect?: (value: { from: Date; to: Date }) => void }) => (
        <button
            type="button"
            onClick={() =>
                onSelect?.({
                    from: new Date(Date.UTC(2026, 5, 1)),
                    to: new Date(Date.UTC(2026, 5, 8)),
                })
            }
        >
            Select June range
        </button>
    ),
    DataTable: ({ emptyText }: { emptyText: string }) => <div>{emptyText}</div>,
    DateTimeCell: ({ value }: { value: string }) => <span>{value}</span>,
    MoneyCell: ({ valueInCents }: { valueInCents: number }) => <span>{valueInCents}</span>,
    Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SELECT_EMPTY_VALUE: "__empty__",
    Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => (
        <button type="button">{children}</button>
    ),
    SelectValue: () => <span />,
    StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
    TablePagination: () => null,
    parsePageParam: (value: null | string) => Number.parseInt(value ?? "1", 10) || 1,
    parsePageSizeParam: (value: null | string) => Number.parseInt(value ?? "20", 10) || 20,
    useDashboardQuery: useDashboardQueryMock,
    useResettableFilterForm: (searchParamsKey: string) => {
        const formRef = React.useRef<HTMLFormElement>(null);
        const [resetVersion, setResetVersion] = React.useState(0);

        return {
            formKey: `${searchParamsKey}:${resetVersion}`,
            formRef,
            resetForm: () => {
                formRef.current?.reset();
                setResetVersion((currentVersion) => currentVersion + 1);
            },
        };
    },
}));

import { OrderListPage } from "@/dashboards/admin/pages/order-list";

function LocationProbe({ onSearchChange }: { onSearchChange: (search: string) => void }) {
    const location = useLocation();

    onSearchChange(location.search);

    return null;
}

describe("admin order list filters", () => {
    let container: HTMLDivElement;
    let root: Root;

    afterEach(() => {
        act(() => {
            root?.unmount();
        });
        container?.remove();
        useDashboardQueryMock.mockClear();
    });

    async function renderOrderList(initialEntry: string, onSearchChange: (search: string) => void) {
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container as unknown as Parameters<typeof createRoot>[0]);

        await act(async () => {
            root.render(
                <MemoryRouter initialEntries={[initialEntry]}>
                    <OrderListPage />
                    <LocationProbe onSearchChange={onSearchChange} />
                </MemoryRouter>
            );
        });
    }

    function getButton(text: string) {
        const button = Array.from(container.querySelectorAll("button")).find((item) =>
            item.textContent?.includes(text)
        );

        if (!button) {
            throw new Error(`Missing button: ${text}`);
        }

        return button;
    }

    it("stores createdAt range in URL and sends DateTime filters to GraphQL", async () => {
        let currentSearch = "";

        await renderOrderList("/orders?page=3", (search) => (currentSearch = search));

        await act(async () => {
            getButton("Select June range").click();
        });

        await act(async () => {
            getButton("Filter").click();
        });

        expect(new URLSearchParams(currentSearch).get("createdAtRange")).toBe(
            JSON.stringify(["2026-06-01", "2026-06-08"])
        );
        expect(currentSearch).toContain("page=1");
        expect(useDashboardQueryMock).toHaveBeenLastCalledWith(
            expect.anything(),
            expect.objectContaining({
                where: expect.objectContaining({
                    createdAt: {
                        gte: "2026-06-01T00:00:00.000Z",
                        lt: "2026-06-09T00:00:00.000Z",
                    },
                }),
            })
        );
    });

    it("clears createdAt range when filters reset", async () => {
        let currentSearch = "";

        await renderOrderList(
            `/orders?createdAtRange=${encodeURIComponent(
                JSON.stringify(["2026-06-01", "2026-06-08"])
            )}&page=2`,
            (search) => (currentSearch = search)
        );

        await act(async () => {
            getButton("Reset").click();
        });

        expect(currentSearch).toContain("page=1");
        expect(currentSearch).not.toContain("createdAtRange");
    });
});

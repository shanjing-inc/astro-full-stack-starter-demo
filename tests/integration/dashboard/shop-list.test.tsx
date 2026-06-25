// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
});

const { executeDashboardGraphQLMock, refetchMock, useDashboardQueryMock } = vi.hoisted(() => ({
    executeDashboardGraphQLMock: vi.fn(),
    refetchMock: vi.fn(),
    useDashboardQueryMock: vi.fn(() => ({
        data: {
            listShops: [
                {
                    createdAt: "2026-06-01T00:00:00Z",
                    id: "7",
                    name: "North Shop",
                    orders: [
                        {
                            id: "20",
                            orderNo: "ORDER-20",
                            status: "paid",
                        },
                    ],
                    products: [
                        {
                            id: "10",
                            name: "Starter Mug",
                            sku: "MUG-001",
                        },
                        {
                            id: "11",
                            name: "Starter Tee",
                            sku: "TEE-001",
                        },
                    ],
                    slug: "north-shop",
                    status: "active",
                    updatedAt: "2026-06-02T00:00:00Z",
                },
            ],
        },
        error: undefined,
        loading: false,
        refetch: refetchMock,
    })),
}));

vi.mock("@shanjing/astro-full-stack-starter/dashboard/client", () => ({
    DataTable: ({
        columns,
        emptyText,
        getRowKey,
        items,
    }: {
        columns: {
            header: string;
            key: string;
            render: (item: Record<string, unknown>) => React.ReactNode;
        }[];
        emptyText: string;
        getRowKey: (item: Record<string, unknown>) => string;
        items: Record<string, unknown>[];
    }) => (
        <table>
            <thead>
                <tr>
                    {columns.map((column) => (
                        <th key={column.key}>{column.header}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {items.length > 0 ? (
                    items.map((item) => (
                        <tr key={getRowKey(item)}>
                            {columns.map((column) => (
                                <td key={column.key}>{column.render(item)}</td>
                            ))}
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td>{emptyText}</td>
                    </tr>
                )}
            </tbody>
        </table>
    ),
    DateTimeCell: ({ value }: { value: string }) => <span>{value}</span>,
    SELECT_EMPTY_VALUE: "__empty__",
    Select: ({
        children,
        defaultValue,
        disabled,
        name,
    }: React.ComponentProps<"select"> & { children: React.ReactNode }) => (
        <div>
            {name ? (
                <input
                    disabled={disabled}
                    name={name}
                    type="hidden"
                    defaultValue={String(defaultValue ?? "")}
                />
            ) : null}
            {children}
        </div>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => (
        <button type="button">{children}</button>
    ),
    SelectValue: () => <span />,
    Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
        open ? <div role="dialog">{children}</div> : null,
    SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    SheetFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
    SheetHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
    SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
    TablePagination: () => null,
    executeDashboardGraphQL: executeDashboardGraphQLMock,
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

import { ShopListPage } from "@/dashboards/admin/pages/shop-list";

describe("admin shop list details", () => {
    let container: HTMLDivElement;
    let root: Root;

    afterEach(() => {
        act(() => {
            root?.unmount();
        });
        container?.remove();
        executeDashboardGraphQLMock.mockReset();
        refetchMock.mockReset();
        useDashboardQueryMock.mockClear();
    });

    async function renderShopList(initialEntry = "/shop/list?page=2&slug=north") {
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container as unknown as Parameters<typeof createRoot>[0]);

        await act(async () => {
            root.render(
                <MemoryRouter initialEntries={[initialEntry]}>
                    <ShopListPage />
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

    function getInput(name: string) {
        const input =
            container.querySelector(`[role="dialog"] [name="${name}"]`) ??
            container.querySelector(`[name="${name}"]`);

        if (!(input instanceof HTMLInputElement)) {
            throw new Error(`Missing field: ${name}`);
        }

        return input;
    }

    it("opens a detail sheet from each row and shows shop details", async () => {
        await renderShopList();

        await act(async () => {
            getButton("View details").click();
        });

        expect(container.querySelector('[role="dialog"]')).not.toBeNull();
        expect(container.textContent).toContain("North Shop");
        expect(container.textContent).toContain("north-shop");
        expect(container.textContent).toContain("active");
        expect(container.textContent).toContain("2026-06-01T00:00:00Z");
        expect(container.textContent).toContain("2026-06-02T00:00:00Z");
        expect(container.textContent).toContain("Products");
        expect(container.textContent).toContain("2");
        expect(container.textContent).toContain("Orders");
        expect(container.textContent).toContain("1");
    });

    it("clears unsaved filter fields when reset keeps the same URL params", async () => {
        await renderShopList("/shop/list?page=1");

        await act(async () => {
            const slugInput = getInput("slug");
            slugInput.value = "north";
            slugInput.dispatchEvent(new Event("input", { bubbles: true }));
        });

        expect(getInput("slug").value).toBe("north");

        await act(async () => {
            getButton("Reset").click();
        });

        expect(getInput("slug").value).toBe("");
    });

    it("saves edited fields with the current shop id and refreshes the list", async () => {
        executeDashboardGraphQLMock.mockResolvedValue({
            updateShop: [
                {
                    id: "7",
                    name: "North Shop Updated",
                    slug: "north-shop-updated",
                    status: "archived",
                },
            ],
        });

        await renderShopList();

        await act(async () => {
            getButton("View details").click();
        });

        await act(async () => {
            const nameInput = getInput("name");
            const slugInput = getInput("slug");
            const statusInput = getInput("status");

            nameInput.value = "North Shop Updated";
            slugInput.value = "north-shop-updated";
            statusInput.value = "archived";
            nameInput.dispatchEvent(new Event("input", { bubbles: true }));
            slugInput.dispatchEvent(new Event("input", { bubbles: true }));
            statusInput.dispatchEvent(new Event("change", { bubbles: true }));
        });

        await act(async () => {
            getButton("Save changes").click();
        });

        expect(executeDashboardGraphQLMock).toHaveBeenCalledWith(expect.anything(), {
            set: {
                name: "North Shop Updated",
                slug: "north-shop-updated",
                status: "archived",
            },
            where: {
                id: {
                    eq: 7,
                },
            },
        });
        expect(refetchMock).toHaveBeenCalledTimes(1);
        expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it("shows mutation errors inside the sheet and keeps the form editable", async () => {
        executeDashboardGraphQLMock.mockRejectedValue(new Error("Slug already exists."));

        await renderShopList();

        await act(async () => {
            getButton("View details").click();
        });

        await act(async () => {
            getButton("Save changes").click();
        });

        expect(container.querySelector('[role="alert"]')?.textContent).toContain(
            "Slug already exists."
        );
        expect(container.querySelector('[role="dialog"]')).not.toBeNull();
        expect(getInput("slug").disabled).toBe(false);
    });
});

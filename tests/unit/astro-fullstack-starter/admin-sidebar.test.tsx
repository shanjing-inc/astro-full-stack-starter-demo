// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DashboardApp from "@shanjing/astro-full-stack-starter/dashboard/app";
import { memberEntries } from "@/dashboards/member/routes";
import { adminEntries } from "@/dashboards/admin/routes";

describe("package dashboard sidebar navigation", () => {
    beforeEach(() => {
        window.history.pushState({}, "", "/admin/user/list");
        Object.defineProperty(window, "matchMedia", {
            configurable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                addEventListener: vi.fn(),
                addListener: vi.fn(),
                dispatchEvent: vi.fn(),
                matches: false,
                media: query,
                onchange: null,
                removeEventListener: vi.fn(),
                removeListener: vi.fn(),
            })),
        });
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                return new Response(
                    JSON.stringify([
                        {
                            data: {
                                getCurrentUser: {
                                    email: "admin@example.com",
                                    id: "1",
                                    image: null,
                                    name: "Admin",
                                    role: "admin",
                                },
                            },
                        },
                    ]),
                    {
                        headers: {
                            "content-type": "application/json",
                        },
                        status: 200,
                    }
                );
            })
        );
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        window.history.pushState({}, "", "/");
    });

    it("only marks the current menu button as active", () => {
        window.history.pushState({}, "", "/admin/shop/list");
        render(<DashboardApp basePath="/admin" entries={adminEntries} />);

        expect(screen.getByRole("button", { name: "Dashboard" })).not.toHaveAttribute(
            "data-active"
        );
        expect(screen.getAllByRole("button", { name: "用户管理" })).toHaveLength(2);
        for (const shopButton of screen.getAllByRole("button", { name: "店铺管理" })) {
            expect(shopButton).toHaveAttribute("data-active", "true");
        }
    });

    it("does not expose queue navigation in the member dashboard", () => {
        window.history.pushState({}, "", "/member");
        render(<DashboardApp basePath="/member" entries={memberEntries} />);

        expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "队列管理" })).toBeNull();
    });

    it("keeps unknown member routes on a dashboard missing page", () => {
        window.history.pushState({}, "", "/member/unknown");
        render(<DashboardApp basePath="/member" entries={memberEntries} />);

        expect(screen.getByRole("heading", { name: "页面缺失" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "返回 Dashboard" })).toHaveAttribute(
            "href",
            "/member"
        );
        expect(window.location.pathname).toBe("/member/unknown");
    });

    it("does not emit the React Router startTransition future warning", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        render(<DashboardApp basePath="/admin" entries={adminEntries} />);

        expect(
            warnSpy.mock.calls.some((call) =>
                call.some(
                    (message) =>
                        typeof message === "string" && message.includes("v7_startTransition")
                )
            )
        ).toBe(false);
    });

    it("expands nav-only parent menus without changing the current route", () => {
        window.history.pushState({}, "", "/admin/shop/list");
        render(<DashboardApp basePath="/admin" entries={adminEntries} />);

        fireEvent.click(screen.getAllByRole("button", { name: "用户管理" })[1]);

        expect(window.location.pathname).toBe("/admin/shop/list");
        expect(screen.getByRole("link", { name: "用户列表" })).toHaveAttribute(
            "href",
            "/admin/user/list"
        );
    });

    it("keeps nav-only parent menus active on hidden child routes", () => {
        window.history.pushState({}, "", "/admin/queues/jobs/failed/record-1");
        render(<DashboardApp basePath="/admin" entries={adminEntries} />);

        for (const queueButton of screen.getAllByRole("button", { name: "队列管理" })) {
            expect(queueButton).toHaveAttribute("data-active", "true");
        }
        expect(screen.getByRole("link", { name: "失败任务" })).toHaveAttribute(
            "href",
            "/admin/queues/jobs/failed"
        );
    });
});

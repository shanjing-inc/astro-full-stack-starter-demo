// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DashboardApp from "@shanjing/astro-full-stack-starter/dashboard/app";
import { memberRoutes } from "@/dashboards/member/routes";
import { adminRoutes } from "@/dashboards/admin/routes";

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
        render(<DashboardApp basePath="/admin" routes={adminRoutes} />);

        expect(screen.getByRole("button", { name: "Dashboard" })).not.toHaveAttribute(
            "data-active"
        );
        expect(screen.getAllByRole("button", { name: "用户" })).toHaveLength(2);
        for (const shopButton of screen.getAllByRole("button", { name: "店铺" })) {
            expect(shopButton).toHaveAttribute("data-active", "true");
        }
    });

    it("does not expose queue navigation in the member dashboard", () => {
        window.history.pushState({}, "", "/member");
        render(<DashboardApp basePath="/member" routes={memberRoutes} />);

        expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "队列" })).toBeNull();
    });

    it("keeps unknown member routes on a dashboard missing page", () => {
        window.history.pushState({}, "", "/member/unknown");
        render(<DashboardApp basePath="/member" routes={memberRoutes} />);

        expect(screen.getByRole("heading", { name: "页面缺失" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "返回 Dashboard" })).toHaveAttribute(
            "href",
            "/member"
        );
        expect(window.location.pathname).toBe("/member/unknown");
    });

    it("does not emit the React Router startTransition future warning", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        render(<DashboardApp basePath="/admin" routes={adminRoutes} />);

        expect(
            warnSpy.mock.calls.some((call) =>
                call.some(
                    (message) =>
                        typeof message === "string" && message.includes("v7_startTransition")
                )
            )
        ).toBe(false);
    });
});

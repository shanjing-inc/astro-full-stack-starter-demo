// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SuperAdminApp from "@shanjing/astro-full-stack-starter/super-admin/app";

describe("package super-admin sidebar navigation", () => {
    beforeEach(() => {
        window.history.pushState({}, "", "/super-admin/user/list");
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
        render(<SuperAdminApp />);

        expect(screen.getByRole("button", { name: "Dashboard" })).not.toHaveAttribute(
            "data-active"
        );
        for (const userButton of screen.getAllByRole("button", { name: "用户" })) {
            expect(userButton).toHaveAttribute("data-active", "true");
        }
    });

    it("does not emit the React Router startTransition future warning", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        render(<SuperAdminApp />);

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

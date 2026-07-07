import { describe, expect, it } from "vitest";

import { resolveDashboardReturnTo } from "@/lib/dashboard-return-to";

describe("resolveDashboardReturnTo", () => {
    it("keeps local dashboard paths with query and hash", () => {
        expect(resolveDashboardReturnTo("/member/orders?page=2#latest", "/member")).toBe(
            "/member/orders?page=2#latest"
        );
    });

    it("falls back to the dashboard root when returnTo is empty", () => {
        expect(resolveDashboardReturnTo("", "/member")).toBe("/member");
    });

    it("rejects external URLs", () => {
        expect(resolveDashboardReturnTo("https://example.com/member/orders", "/member")).toBe(
            "/member"
        );
        expect(resolveDashboardReturnTo("//example.com/member/orders", "/member")).toBe("/member");
    });

    it("rejects paths outside the dashboard", () => {
        expect(resolveDashboardReturnTo("/member-admin/orders", "/member")).toBe("/member");
    });

    it("rejects the dashboard login path", () => {
        expect(resolveDashboardReturnTo("/member/login?returnTo=/member/orders", "/member")).toBe(
            "/member"
        );
        expect(resolveDashboardReturnTo("/member/login/expired", "/member")).toBe("/member");
    });
});

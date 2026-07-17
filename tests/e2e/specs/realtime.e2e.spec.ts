import { expect, test } from "@playwright/test";

test.describe("realtime diagnostics pages", () => {
    test("renders the WebSocket diagnostics page", async ({ page }) => {
        await page.goto("/test/websocket");

        await expect(page).toHaveTitle("WebSocket Test");
        await expect(page.getByRole("button", { name: "连接" })).toBeVisible();
        await expect(page.getByRole("button", { name: "发送 ping" })).toBeVisible();
        await expect(page.getByRole("button", { name: "测试主动推送" })).toBeVisible();
    });

    test("renders the SSE diagnostics page", async ({ page }) => {
        await page.goto("/test/sse");

        await expect(page).toHaveTitle("SSE Test");
        await expect(page.locator("h1")).toContainText("SSE");
        await expect(page.locator("body")).toContainText("/api/sse/public");
        await expect(page.getByRole("button", { name: "连接" })).toBeVisible();
        await expect(page.getByRole("button", { name: "断开" })).toBeVisible();
    });
});

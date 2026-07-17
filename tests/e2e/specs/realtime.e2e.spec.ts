import { expect, test } from "@playwright/test";

test("renders the SSE diagnostics page", async ({ page }) => {
    await page.goto("/test/sse");

    await expect(page).toHaveTitle("SSE Test");
    await expect(page.locator("h1")).toContainText("SSE");
    await expect(page.locator("body")).toContainText("/api/sse/public");
    await expect(page.getByRole("button", { name: "连接" })).toBeVisible();
    await expect(page.getByRole("button", { name: "断开" })).toBeVisible();
});

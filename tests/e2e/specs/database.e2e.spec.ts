import { expect, test } from "@playwright/test";

test("renders the database diagnostics page", async ({ page }) => {
    await page.goto("/test/database");

    await expect(page).toHaveTitle("Database Test");
    await expect(page.locator("h1")).toContainText("MySQL");
    await expect(page.locator("body")).toContainText("mysql2");
    await expect(page.locator("body")).toContainText("drizzle");
    await expect(page.locator("body")).toContainText("Session time_zone");
    await expect(page.locator("body")).toContainText("浏览器时区");
    await expect(page.locator("body")).toContainText("浏览器时间");
    await expect(page.locator("body")).toContainText("createdAt（数据库原始值）");
    await expect(page.locator("body")).toContainText("createdAt（本地时间）");
    await expect(page.locator("h2")).toContainText("shop");
    await expect(page.getByRole("button", { name: "新增随机店铺" })).toBeVisible();
});

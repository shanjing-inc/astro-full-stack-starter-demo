import { expect, test } from "@playwright/test";

test.describe("test pages smoke", () => {
    test("renders the GraphQL playground page and loads presets", async ({ page }) => {
        await page.goto("/test/graphql");

        await expect(page).toHaveTitle("GraphQL Test");
        await expect(page.locator("h1")).toContainText("GraphQL");
        await expect(page.locator("#graphql-endpoint-path")).toHaveText("/api/graphql/member");
        await expect(page.locator("#graphql-query")).toHaveValue(/query ListShops/);
        await expect(page.locator("#graphql-variables")).toHaveValue(/"limit": 5/);

        await page.getByRole("button", { name: "CreateShop" }).click();

        await expect(page.locator("#graphql-endpoint-path")).toHaveText("/api/graphql/super-admin");
        await expect(page.locator("#graphql-query")).toHaveValue(/mutation CreateShop/);

        await page.selectOption("#graphql-endpoint", "member");
        await expect(page.locator("#graphql-endpoint-path")).toHaveText("/api/graphql/member");
    });

    test("renders the MySQL diagnostics page", async ({ page }) => {
        await page.goto("/test/mysql");

        await expect(page).toHaveTitle("MySQL Test");
        await expect(page.locator("h1")).toContainText("MySQL");
        await expect(page.locator("body")).toContainText("mysql2");
        await expect(page.locator("body")).toContainText("drizzle");
        await expect(page.locator("h2")).toContainText("shop");
    });

    test("renders the queue dispatch page", async ({ page }) => {
        await page.goto("/test/queue");

        await expect(page).toHaveTitle("Queue Test");
        await expect(page.locator("h1")).toContainText("BullMQ");
        await expect(page.locator("body")).toContainText("default");
        await expect(page.locator("body")).toContainText("critical");
        await expect(page.locator("body")).toContainText("both");
        await expect(page.locator("body")).toContainText("none");
    });

    test("renders the Redis cache diagnostics page", async ({ page }) => {
        await page.goto("/test/cache");

        await expect(page).toHaveTitle("Cache Test");
        await expect(page.locator("h1")).toContainText("Redis Cache");
        await expect(page.locator("body")).toContainText("strong-per-key");
        await expect(page.locator("body")).toContainText("lock_supported");
        await expect(page.locator("body")).toContainText("acquire");
        await expect(page.locator("body")).toContainText("withLock");
        await expect(page.locator("body")).not.toContainText("/test/redis");
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

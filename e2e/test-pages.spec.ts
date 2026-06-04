import { expect, test } from "@playwright/test";

test.describe("Cloudflare D1 demo pages", () => {
    test("renders the GraphQL playground page and loads business presets", async ({ page }) => {
        await page.goto("/test/graphql");

        await expect(page).toHaveTitle("GraphQL Test");
        await expect(page.locator("h1")).toContainText("GraphQL");
        await expect(page.locator("#graphql-endpoint-path")).toHaveText("/api/graphql/member");

        await page.getByRole("button", { name: "CreateShop" }).click();

        await expect(page.locator("#graphql-endpoint-path")).toHaveText("/api/graphql/super-admin");
        await expect(page.locator("#graphql-query")).toHaveValue(/mutation CreateShop/);
    });

    test("renders Cloudflare platform boundary pages", async ({ page }) => {
        await page.goto("/test/queue");
        await expect(page).toHaveTitle("Queue Test");
        await expect(page.locator("body")).toContainText("Cloudflare Queues");
        await expect(page.getByRole("button", { name: "投递任务" }).first()).toBeVisible();
        await expect(page.locator("body")).toContainText("最近执行记录");

        await page.goto("/test/cache");
        await expect(page).toHaveTitle("Cache Test");
        await expect(page.locator("h1")).toContainText("Cloudflare Cache");
        await expect(page.locator("body")).toContainText("Cloudflare KV");
        await expect(page.locator("body")).toContainText("Cache API");
        await expect(page.locator("body")).toContainText("Durable Object");
        await expect(page.locator("body")).toContainText("global-eventual");
        await expect(page.locator("body")).toContainText("edge-local");
        await expect(page.locator("body")).toContainText("strong-per-key");
        await expect(page.locator("body")).toContainText("单可用区缓存");
        await expect(page.locator("body")).toContainText("独立费用为 0");

        await page.goto("/test/websocket");
        await expect(page).toHaveTitle("WebSocket Test");
        await expect(page.getByRole("button", { name: "连接" })).toBeVisible();
        await expect(page.getByRole("button", { name: "发送 ping" })).toBeVisible();
        await expect(page.getByRole("button", { name: "测试主动推送" })).toBeVisible();

        await page.goto("/test/sse");
        await expect(page).toHaveTitle("SSE Test");
        await expect(page.locator("h1")).toContainText("SSE");
        await expect(page.locator("body")).toContainText("/api/sse/public");
        await expect(page.getByRole("button", { name: "连接" })).toBeVisible();
        await expect(page.getByRole("button", { name: "断开" })).toBeVisible();
    });
});

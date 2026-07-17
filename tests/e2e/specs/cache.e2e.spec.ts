import { expect, test } from "@playwright/test";

test("renders the Cloudflare cache diagnostics page", async ({ page }) => {
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
});

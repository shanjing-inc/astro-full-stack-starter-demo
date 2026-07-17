import { expect, test } from "@playwright/test";

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

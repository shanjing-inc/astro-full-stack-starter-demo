import { expect, test } from "@playwright/test";

test("renders the Cloudflare queue diagnostics page", async ({ page }) => {
    await page.goto("/test/queue");

    await expect(page).toHaveTitle("Queue Test");
    await expect(page.locator("body")).toContainText("Cloudflare Queues");
    await expect(page.getByRole("button", { name: "投递任务" }).first()).toBeVisible();
    await expect(page.locator("body")).toContainText("最近执行记录");
});

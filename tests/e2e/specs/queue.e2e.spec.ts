import { expect, test } from "@playwright/test";

test("renders the queue dispatch page", async ({ page }) => {
    await page.goto("/test/queue");

    await expect(page).toHaveTitle("Queue Test");
    await expect(page.locator("h1")).toContainText("BullMQ");
    await expect(page.locator("body")).toContainText("default");
    await expect(page.locator("body")).toContainText("critical");
    await expect(page.locator("body")).toContainText("both");
    await expect(page.locator("body")).toContainText("none");
});

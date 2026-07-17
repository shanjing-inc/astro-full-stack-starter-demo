import { expect, test } from "@playwright/test";

test("renders the GraphQL playground page and loads presets", async ({ page }) => {
    await page.goto("/test/graphql");

    await expect(page).toHaveTitle("GraphQL Test");
    await expect(page.locator("h1")).toContainText("GraphQL");
    await expect(page.locator("#graphql-endpoint-path")).toHaveText("/api/graphql/member");
    await expect(page.locator("#graphql-query")).toHaveValue(/query ListShops/);
    await expect(page.locator("#graphql-variables")).toHaveValue(/"limit": 5/);

    await page.getByRole("button", { name: "CreateShop" }).click();

    await expect(page.locator("#graphql-endpoint-path")).toHaveText("/api/graphql/admin");
    await expect(page.locator("#graphql-query")).toHaveValue(/mutation CreateShop/);

    await page.selectOption("#graphql-endpoint", "member");
    await expect(page.locator("#graphql-endpoint-path")).toHaveText("/api/graphql/member");
});

import { expect, test } from "@playwright/test";

test("renders the GraphQL playground page and loads business presets", async ({ page }) => {
    await page.goto("/test/graphql");

    await expect(page).toHaveTitle("GraphQL Test");
    await expect(page.locator("h1")).toContainText("GraphQL");
    await expect(page.locator("#graphql-endpoint-path")).toHaveText("/api/graphql/member");

    await page.getByRole("button", { name: "CreateShop" }).click();

    await expect(page.locator("#graphql-endpoint-path")).toHaveText("/api/graphql/admin");
    await expect(page.locator("#graphql-query")).toHaveValue(/mutation CreateShop/);
});

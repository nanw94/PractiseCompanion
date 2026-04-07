import { expect, test } from "@playwright/test";

test.describe("app navigation", () => {
  test("bottom nav routes to Library and History", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

    await page.getByRole("button", { name: "Library", exact: true }).click();
    await expect(page).toHaveURL(/\/library/);
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();

    await page.getByRole("button", { name: "History", exact: true }).click();
    await expect(page).toHaveURL("/history");
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
  });
});

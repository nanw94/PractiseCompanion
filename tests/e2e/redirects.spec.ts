import { expect, test } from "@playwright/test";

test.describe("route redirects", () => {
  test("/session redirects to home", async ({ page }) => {
    await page.goto("/session");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  });

  test("/routines redirects to library routines tab", async ({ page }) => {
    await page.goto("/routines");
    await expect(page).toHaveURL(/\/library\?tab=routines/);
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  });
});

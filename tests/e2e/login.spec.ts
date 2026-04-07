import { expect, test } from "@playwright/test";

test.describe("login experience", () => {
  test("shows Supabase configuration warning when env is missing", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Supabase not configured")).toBeVisible();
    await expect(page.getByText("NEXT_PUBLIC_SUPABASE_URL")).toBeVisible();
    await expect(page.getByText("NEXT_PUBLIC_SUPABASE_ANON_KEY")).toBeVisible();
  });
});

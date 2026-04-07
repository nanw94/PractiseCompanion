import { expect, test } from "@playwright/test";

test.describe("routine flow", () => {
  test("start and finish default routine updates Done page and History", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();

    await page.getByRole("button", { name: "Start routine" }).click();

    await expect(page.getByText("Daily practice · Section 1/3")).toBeVisible();
    await expect(page.getByRole("button", { name: "Finish routine" })).toBeVisible();

    await page.getByRole("button", { name: "Finish routine" }).click();

    await expect(page).toHaveURL("/done");
    await expect(page.getByRole("heading", { name: "Done" })).toBeVisible();
    await expect(page.getByText("Daily practice")).toBeVisible();
    await expect(page.getByText("Section 1: Warm-up")).toBeVisible();

    await page.getByRole("button", { name: "History", exact: true }).click();

    await expect(page).toHaveURL("/history");
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Session List" })).toBeVisible();
    await page.getByRole("tab", { name: "Session List" }).click();
    await expect(page.getByRole("button", { name: "Delete session" }).first()).toBeVisible();
  });
});

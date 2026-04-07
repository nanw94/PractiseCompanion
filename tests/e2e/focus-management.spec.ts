import { expect, test } from "@playwright/test";

test.describe("focus management", () => {
  test("can add and rename a focus item", async ({ page }) => {
    await page.goto("/library?tab=focus");

    const unique = `Focus ${Date.now()}`;
    await page.getByLabel("Label").fill(unique);
    await page.getByRole("button", { name: "Add", exact: true }).click();

    await expect(page.getByText(unique)).toBeVisible();

    await page.getByRole("button", { name: "Edit focus", exact: true }).first().click();
    const renamed = `${unique} Updated`;
    await page.locator(`input[value="${unique}"]`).fill(renamed);
    await page.getByRole("button", { name: "Save", exact: true }).first().click();

    await expect(page.getByText(renamed)).toBeVisible();
  });
});

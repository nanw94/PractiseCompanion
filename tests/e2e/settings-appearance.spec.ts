import { test, expect } from "@playwright/test";

test.describe("settings appearance", () => {
  test("allows switching between light, dark, and auto", async ({ page }) => {
    await page.goto("/settings");

    const html = page.locator("html");
    const darkRadio = page.getByRole("radio", { name: "Dark" });
    const lightRadio = page.getByRole("radio", { name: "Light" });
    const autoRadio = page.getByRole("radio", { name: "Auto" });
    const radioGroup = page.getByRole("radiogroup");

    await radioGroup.getByText("Dark", { exact: true }).click();
    await expect(darkRadio).toBeChecked();
    await expect(page.getByText("Using dark theme.")).toBeVisible();
    await expect(html).toHaveAttribute("data-mantine-color-scheme", "dark");

    await radioGroup.getByText("Light", { exact: true }).click();
    await expect(lightRadio).toBeChecked();
    await expect(page.getByText("Using light theme.")).toBeVisible();
    await expect(html).toHaveAttribute("data-mantine-color-scheme", "light");

    await radioGroup.getByText("Auto", { exact: true }).click();
    await expect(autoRadio).toBeChecked();
    await expect(page.getByText("Auto follows your device/browser theme.")).toBeVisible();
  });
});

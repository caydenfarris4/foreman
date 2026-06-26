import { expect, test } from "@playwright/test";

// Smoke tests for the unauthenticated surface. These assert the pages render
// and the key forms exist, without depending on exact marketing copy.
test.describe("public pages", () => {
  test("landing page renders with a path into the app", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    // A signup/login entry point exists.
    await expect(
      page.locator('a[href="/signup"], a[href="/login"]').first(),
    ).toBeVisible();
  });

  test("signup page exposes the account form", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toHaveAttribute(
      "type",
      "password",
    );
  });
});

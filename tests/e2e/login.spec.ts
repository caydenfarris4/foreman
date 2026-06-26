import { expect, test } from "@playwright/test";

// The login screen is a top-tier attack surface (credential stuffing,
// enumeration, XSS via reflected params, open redirect). These tests lock in
// the defensive behavior without asserting any product copy that might change.

test.describe("login screen security", () => {
  test("renders email + password with safe input attributes", async ({ page }) => {
    await page.goto("/login");
    const email = page.locator('input[name="email"]');
    const password = page.locator('input[name="password"]');
    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    // Password must never be a visible text field.
    await expect(password).toHaveAttribute("type", "password");
    await expect(email).toHaveAttribute("type", "email");
    // Bounded input length (defense against oversized payloads).
    await expect(email).toHaveAttribute("maxlength", /\d+/);
    await expect(password).toHaveAttribute("maxlength", /\d+/);
  });

  test("a reflected ?error= is shown as inert text, not executed", async ({
    page,
  }) => {
    let dialogFired = false;
    page.on("dialog", async (d) => {
      dialogFired = true;
      await d.dismiss();
    });
    const payload = "<img src=x onerror=alert(1)>injected";
    await page.goto(`/login?error=${encodeURIComponent(payload)}`);
    // No script/handler executed.
    expect(dialogFired).toBe(false);
    // No injected <img> element made it into the DOM as markup.
    await expect(page.locator("img[onerror]")).toHaveCount(0);
  });

  test("does not leak whether an account exists on a failed login", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "definitely-not-a-user@example.com");
    await page.fill('input[name="password"]', "wrong-password-value");
    await Promise.all([
      page.waitForURL(/\/login/),
      page.click('button[type="submit"]'),
    ]);
    // Stays on /login with a generic message — never "no such user" / "wrong
    // password", which would enable enumeration.
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("no account found");
    expect(body).not.toContain("user does not exist");
    expect(body).not.toContain("wrong password");
  });
});

test.describe("auth gate", () => {
  for (const path of ["/app", "/app/plan", "/app/library", "/onboarding"]) {
    test(`unauthenticated ${path} redirects to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

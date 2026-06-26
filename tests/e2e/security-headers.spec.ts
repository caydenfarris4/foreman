import { expect, test } from "@playwright/test";

// SOC 2 transport / browser-hardening controls. Every response should carry
// the configured security headers (set in next.config.ts).
test("security headers are present on responses", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response).not.toBeNull();
  const headers = response!.headers();

  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["strict-transport-security"]).toContain("max-age=");
});

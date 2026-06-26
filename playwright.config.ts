import { defineConfig, devices } from "@playwright/test";

// Core-flow end-to-end tests. They drive the real app, so they need it served
// with valid Supabase env (the auth middleware runs on every route). Two ways
// to run:
//
//   1. Against a running/deployed instance (recommended, no local secrets):
//        PLAYWRIGHT_BASE_URL=https://foreman.coach npm run test:e2e
//   2. Locally: set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY,
//        then `npm run test:e2e` (Playwright builds + starts the app).
//
// Chromium is preinstalled in CI images; do not run `playwright install` here.

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const useExternalServer = !!process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Some CI/sandbox images ship a preinstalled Chromium whose build
        // differs from the one this Playwright version expects. Point at it
        // via PLAYWRIGHT_CHROMIUM_PATH instead of downloading a new browser.
        ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
          : {}),
      },
    },
  ],
  ...(useExternalServer
    ? {}
    : {
        webServer: {
          command: "npm run build && npm run start",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      }),
});

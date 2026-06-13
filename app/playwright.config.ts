import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Placeholder for step 1 — real end-to-end flows (login, scoped
 * scan views) arrive with steps 2–3. Specs live in tests/e2e/*.spec.ts.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

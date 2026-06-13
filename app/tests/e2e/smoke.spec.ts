import { test, expect } from "@playwright/test";

/**
 * Placeholder e2e smoke test. Unauthenticated users hitting the app should be
 * routed to login. Real flows land with build-sequence steps 2–3.
 *
 * Skipped unless PLAYWRIGHT_BASE_URL points at a running instance.
 */
test.skip(!process.env.PLAYWRIGHT_BASE_URL, "set PLAYWRIGHT_BASE_URL to run e2e");

test("unauthenticated visit is redirected to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

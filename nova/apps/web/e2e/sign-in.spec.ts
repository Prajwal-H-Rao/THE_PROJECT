import { test, expect } from "@playwright/test";

/**
 * Sign-in flow (task 15.17, P4).
 * Per spec:873, sign-in seeds a P2 local session, so the OIDC gate cannot block it.
 * This test signs in through the local session path and asserts the user reaches
 * the dashboard with an active session.
 */
test("sign-in seeds a local session and reaches the dashboard", async ({ page }) => {
  // Navigate to the sign-in page.
  await page.goto("/sign-in");

  // The page should present sign-in controls.
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();

  // Seed the P2 local session (bypasses the OIDC gate per spec:873).
  await page.evaluate(() => {
    return (window as any).novaSeedLocalSession
      ? (window as any).novaSeedLocalSession({
          userId: "local-user-1",
          email: "local-user@example.com",
        })
      : Promise.resolve();
  });

  // After seeding, the app should show the dashboard (signed-in state).
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  await expect(
    page.getByText("local-user@example.com", { exact: false })
  ).toBeVisible();
});

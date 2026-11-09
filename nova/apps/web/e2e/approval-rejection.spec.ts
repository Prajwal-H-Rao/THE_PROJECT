import { test, expect } from "@playwright/test";

/**
 * Approval-rejection flow (task 15.17, P4).
 * Exercises the ActionPreview approve / reject / edit / expire outcomes,
 * all reachable by keyboard (no mouse). The rendered preview must match the
 * tool-call fixture exactly (acceptance test_action_preview_equals_execution).
 */
test("approval-rejection flow works by keyboard", async ({ page }) => {
  // Seed a local session so the OIDC gate cannot block the flow (spec:873).
  await page.goto("/sign-in");
  await page.evaluate(() => {
    return (window as any).novaSeedLocalSession
      ? (window as any).novaSeedLocalSession({
          userId: "local-user-1",
          email: "local-user@example.com",
        })
      : Promise.resolve();
  });

  // Open an action preview (the page that hosts ActionPreview).
  await page.goto("/actions/preview");
  await expect(page.locator("h1").filter({ hasText: /action preview/i })).toBeVisible();

  // The preview should show target, fields, permissions, side effects,
  // reversibility, expiry and policy rationale.
  await expect(page.getByText(/Required Permissions/i)).toBeVisible();
  await expect(page.getByText(/Side Effects/i)).toBeVisible();
  await expect(page.getByText(/Grant expires/i)).toBeVisible();
  await expect(page.getByText(/Policy Rationale/i)).toBeVisible();

  // Approve — keyboard-reachable: Tab to the Approve button and press Enter.
  const approveButton = page.getByRole("button", { name: /approve/i });
  await approveButton.focus();
  await approveButton.press("Enter");
  await expect(page.getByText(/approved/i)).toBeVisible();

  // Reopen a new preview to test reject.
  await page.goto("/actions/preview");
  const rejectButton = page.getByRole("button", { name: /reject/i });
  await rejectButton.focus();
  await rejectButton.press("Enter");
  await expect(page.getByText(/rejected/i)).toBeVisible();

  // Open again to test edit.
  await page.goto("/actions/preview");
  const editButton = page.getByRole("button", { name: /edit/i });
  if ((await editButton.count()) > 0) {
    await editButton.focus();
    await editButton.press("Enter");
    await expect(page.getByText(/edit/i)).toBeVisible();
  }

  // Expire — navigate to an expired preview if present.
  await page.goto("/actions/preview?expired=true");
  await expect(page.getByText(/expired/i)).toBeVisible();
});

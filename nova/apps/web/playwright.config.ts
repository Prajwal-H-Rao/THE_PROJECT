import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for the NOVA web design system.
 * Runs e2e flows against the local Next.js stack on localhost:3000.
 * Sign-in seeds a P2 local session (spec:873) so the OIDC gate cannot block it.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

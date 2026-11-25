import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * Every test starts with cookies already chosen, so the D7 banner does not
 * cover the page. `e2e/consent.spec.ts` clears this to test the banner itself.
 */
export const consentChosen = {
  cookies: [],
  origins: [
    {
      origin: `http://localhost:${PORT}`,
      localStorage: [
        {
          name: "propertyhub:cookie-consent",
          value: JSON.stringify({
            version: 1,
            analytics: false,
            marketing: false,
            decidedAt: new Date().toISOString(),
          }),
        },
      ],
    },
  ],
};

/**
 * Browser tests against a production build served by `next start`, with the
 * MSW mock API (NEXT_PUBLIC_API_URL unset). Run `pnpm build` first, then `pnpm e2e`.
 * Port 3100 keeps clear of a dev server on 3000.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "th-TH",
    trace: "retain-on-failure",
    storageState: consentChosen,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

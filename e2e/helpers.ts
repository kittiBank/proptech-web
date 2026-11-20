import { expect, type Page } from "@playwright/test";

/**
 * Waits until the mock API has answered and every visible loading skeleton is
 * gone. Visible only: Next keeps the previous route mounted but hidden after a
 * client navigation, and its placeholders stay in the DOM.
 */
export async function waitForData(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator('[role="status"][aria-label^="กำลังโหลด"]').filter({ visible: true })).toHaveCount(0);
}

/** Signs in as the mock demo account through the login page, then waits to leave it. */
export async function signIn(page: Page) {
  const { DEMO_ACCOUNT } = await import("../src/mocks/constants");
  await page.goto("/login");
  await page.getByLabel("อีเมล", { exact: true }).fill(DEMO_ACCOUNT.email);
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill(DEMO_ACCOUNT.password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

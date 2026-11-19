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

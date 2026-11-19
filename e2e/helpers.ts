import { expect, type Page } from "@playwright/test";

/** Waits until the mock API has answered and every loading skeleton is gone. */
export async function waitForData(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator('[role="status"][aria-label^="กำลังโหลด"]')).toHaveCount(0);
}

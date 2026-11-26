import AxeBuilder from "@axe-core/playwright";
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

/** Admin sign-in (E11): password, then the mock authenticator code. */
export async function adminSignIn(page: Page, next = "") {
  const { DEMO_ADMIN } = await import("../src/mocks/constants");
  await page.goto(`/admin/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel("อีเมลบริษัท").fill(DEMO_ADMIN.email);
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill(DEMO_ADMIN.password);
  await page.getByRole("button", { name: "ถัดไป" }).click();
  await page.getByLabel("รหัส 6 หลักจากแอป Authenticator").fill(DEMO_ADMIN.code);
  await page.getByRole("button", { name: "ยืนยัน" }).click();
}

/** WCAG 2.1 AA scan of the current page. */
export async function expectNoAxeViolations(page: Page) {
  // Metadata streams in after a client navigation; scan once the title is there.
  await expect(page).not.toHaveTitle("");
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = violations.map((v) => ({ rule: v.id, targets: v.nodes.slice(0, 5).map((n) => n.target.join(" ")) }));
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
}

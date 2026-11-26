import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { waitForData } from "./helpers";

/** Admin is desktop only (handoff §2). */
test.skip(({ isMobile }) => isMobile, "admin is desktop only");

async function adminSignIn(page: Page, next = "") {
  const { DEMO_ADMIN } = await import("../src/mocks/constants");
  await page.goto(`/admin/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel("อีเมลบริษัท").fill(DEMO_ADMIN.email);
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill(DEMO_ADMIN.password);
  await page.getByRole("button", { name: "ถัดไป" }).click();
  await page.getByLabel("รหัส 6 หลักจากแอป Authenticator").fill(DEMO_ADMIN.code);
  await page.getByRole("button", { name: "ยืนยัน" }).click();
}

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = violations.map((v) => ({ rule: v.id, targets: v.nodes.slice(0, 5).map((n) => n.target.join(" ")) }));
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
}

test.describe("admin app (FE-20)", () => {
  test("sign-in with 2FA, dashboard, roles and audit log", async ({ page }) => {
    await page.goto("/admin/settings/roles");
    await page.waitForURL(/\/admin\/login\?next=/);
    await expectNoAxeViolations(page);

    await adminSignIn(page, "/admin/settings/roles");
    await page.waitForURL("**/admin/settings/roles");
    await waitForData(page);
    await expect(page.getByRole("heading", { level: 1, name: "สิทธิ์และบันทึกการใช้งาน" })).toBeVisible();
    await expect(page.getByRole("table", { name: /บันทึกการใช้งาน/ })).toContainText("เข้าสู่ระบบ");
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: "แดชบอร์ด" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "แดชบอร์ด" })).toBeVisible();
    await waitForData(page);
    await expect(page.getByRole("img", { name: /ประกาศเข้าคิวรายชั่วโมงวันนี้/ })).toBeVisible();
    await expectNoAxeViolations(page);

    // A full reload keeps the session and the day's log.
    await page.goto("/admin/settings/roles");
    await expect(page.getByRole("table", { name: /บันทึกการใช้งาน/ })).toContainText("เข้าสู่ระบบ");

    await page.getByRole("button", { name: "ออกจากระบบ" }).click();
    await page.waitForURL("**/admin/login");
  });
});

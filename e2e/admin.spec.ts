import { expect, test } from "@playwright/test";
import { adminSignIn, expectNoAxeViolations, waitForData } from "./helpers";

/** Admin is desktop only (handoff §2). */
test.skip(({ isMobile }) => isMobile, "admin is desktop only");

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

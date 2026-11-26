import { expect, test } from "@playwright/test";
import { adminSignIn, expectNoAxeViolations, waitForData } from "./helpers";

test.skip(({ isMobile }) => isMobile, "admin is desktop only");

test.describe("admin review queues (FE-21)", () => {
  test("moderation: continuous review moves to the next listing", async ({ page }) => {
    await adminSignIn(page, "/admin/moderation");
    await page.waitForURL("**/admin/moderation");
    await waitForData(page);
    await expect(page.getByRole("link", { name: /รอตรวจ\s*38/ })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: "เริ่มตรวจต่อเนื่อง" }).click();
    await expect(page.getByText(/ข้อที่ 1 จาก 38/)).toBeVisible();
    const firstUrl = page.url();
    await waitForData(page);
    await expectNoAxeViolations(page);

    await page.getByRole("checkbox", { name: "ประกาศซ้ำ" }).check();
    await page.getByRole("button", { name: "ตีกลับให้แก้ไข" }).click();
    await expect(page).not.toHaveURL(firstUrl);
    await expect(page.getByText(/ข้อที่ 1 จาก 37/)).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "เมนูแอดมิน" }).getByRole("link", { name: /ตรวจประกาศ\s*37/ }),
    ).toBeVisible();
  });

  test("reports: suspend from the detail panel", async ({ page }) => {
    await adminSignIn(page, "/admin/reports");
    await page.waitForURL("**/admin/reports");
    await waitForData(page);
    await expectNoAxeViolations(page);
    const panel = page.getByRole("complementary").first();
    await panel.getByRole("button", { name: "ระงับบัญชีและทุกประกาศ" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "ระงับบัญชี" }).click();
    await expect(page.getByRole("status").filter({ hasText: "ระงับบัญชีและทุกประกาศ:" })).toBeVisible();
  });

  test("KYC: open the documents, then approve", async ({ page }) => {
    await adminSignIn(page, "/admin/kyc");
    await page.waitForURL("**/admin/kyc");
    await waitForData(page);
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "เปิดดูเอกสาร" }).click();
    await expect(page.getByText(/OCR:/)).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "อนุมัติ" }).click();
    await expect(page.getByRole("link", { name: /รอตรวจ\s*11/ })).toBeVisible();

    await page.goto("/admin/settings/roles");
    await expect(page.getByRole("table", { name: /บันทึกการใช้งาน/ })).toContainText("เปิดดูเอกสาร KYC-3310");
  });
});

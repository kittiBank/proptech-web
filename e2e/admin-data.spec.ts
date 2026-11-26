import { expect, test } from "@playwright/test";
import { adminSignIn, expectNoAxeViolations, waitForData } from "./helpers";

test.skip(({ isMobile }) => isMobile, "admin is desktop only");

test.describe("admin data screens (FE-22)", () => {
  test("users: the top-bar search opens the account and shows its shared phone", async ({ page }) => {
    await adminSignIn(page);
    await page.waitForURL("**/admin");
    await page.getByLabel("ค้นหาทั้งระบบ").fill("88213");
    await page.getByLabel("ค้นหาทั้งระบบ").press("Enter");
    await page.waitForURL(/\/admin\/users\?q=88213/);
    await waitForData(page);
    const panel = page.getByRole("complementary", { name: "user_88213" });
    await expect(panel.getByText("ใช้ร่วมกับอีก 2 บัญชี")).toBeVisible();
    await expectNoAxeViolations(page);
    await panel.getByRole("link", { name: "ดู", exact: true }).click();
    await expect(page.getByRole("table", { name: "ผู้ใช้" }).getByRole("row")).toHaveCount(4);
  });

  test("revenue, promo slots and the CMS pass axe", async ({ page }) => {
    await adminSignIn(page, "/admin/revenue");
    await page.waitForURL("**/admin/revenue");
    await waitForData(page);
    await expect(page.getByText("รออนุมัติคืนเงิน")).toBeVisible();
    await expectNoAxeViolations(page);

    await page.goto("/admin/promo-slots");
    await waitForData(page);
    await expect(page.getByRole("img", { name: /ขายแล้ว/ })).toHaveCount(7);
    await expectNoAxeViolations(page);

    await page.goto("/admin/cms");
    await waitForData(page);
    await expectNoAxeViolations(page);
    await page
      .getByRole("link", { name: /^แก้ไข / })
      .first()
      .click();
    await expect(page.getByRole("heading", { level: 1, name: "แก้ไขบทความ" })).toBeVisible();
    await waitForData(page);
    await expectNoAxeViolations(page);
  });

  test("CMS: a new draft gets a block, is saved and published", async ({ page }) => {
    await adminSignIn(page, "/admin/cms");
    await page.waitForURL("**/admin/cms");
    await page.getByRole("button", { name: "บทความใหม่" }).click();
    await page.waitForURL(/\/admin\/cms\/ART-/);
    await page.getByLabel("ชื่อบทความ").fill("เช็กลิสต์รับห้องคอนโด");
    await page.getByRole("button", { name: "เพิ่ม การ์ดประกาศ" }).click();
    await page.getByLabel("Slug").fill("condo-handover-checklist");
    await page.getByRole("button", { name: "บันทึก", exact: true }).click();
    await expect(page.getByText(/^บันทึก \d/)).toBeVisible();
    await page.getByRole("button", { name: "เผยแพร่", exact: true }).click();
    await expect(page.getByText("เผยแพร่แล้ว").first()).toBeVisible();
  });
});

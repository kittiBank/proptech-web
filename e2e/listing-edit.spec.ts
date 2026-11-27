import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, signIn, waitForData } from "./helpers";

/** FE-24: edit mode of the posting wizard for published and rejected listings. */
test.describe("edit an existing listing (FE-24)", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("a rejected listing opens from the overview to-do and goes back to review", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForData(page);
    await page.getByRole("region", { name: "ต้องจัดการ" }).getByRole("link", { name: /แก้ไข/ }).click();
    await page.waitForURL(/\/dashboard\/listings\/[^/]+\/edit\/type$/);

    await expect(page.getByRole("note").filter({ hasText: "ประกาศนี้ไม่ผ่านการตรวจ" })).toBeVisible();
    // Prefilled: the listing's property type is already chosen.
    await expect(page.getByRole("radio", { checked: true }).first()).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: "ถัดไป" }).click();
    await page.waitForURL(/\/edit\/location$/);
    await page.getByRole("button", { name: "ส่งตรวจอีกครั้ง" }).click();
    await page.waitForURL(/\/dashboard\/listings\?status=pending_review$/);
    await expect(page.getByText("ส่งตรวจอีกครั้งแล้ว", { exact: false })).toBeVisible();
  });

  test("a published listing is edited from the row menu and stays live", async ({ page }) => {
    await page.goto("/dashboard/listings?status=published");
    await waitForData(page);
    await page
      .getByRole("button", { name: /^ตัวเลือกเพิ่มเติม / })
      .filter({ visible: true })
      .first()
      .click();
    await page.getByRole("link", { name: "แก้ไขประกาศ" }).click();
    await page.waitForURL(/\/edit\/type$/);

    // Every step is open in edit mode; the edits carry across steps until saved.
    await page.getByRole("link", { name: "ถัดไป" }).click();
    await page.getByRole("link", { name: "ถัดไป" }).click();
    await page.waitForURL(/\/edit\/details$/);
    const title = page.getByLabel(/หัวข้อประกาศ/);
    await title.fill("คอนโดแต่งใหม่ ใกล้รถไฟฟ้า พร้อมอยู่");
    await expect(page.getByText("มีการแก้ไข 1 จุดที่ยังไม่บันทึก")).toBeVisible();
    await page.getByRole("link", { name: "ถัดไป" }).click();
    await page.waitForURL(/\/edit\/photos$/);
    await expect(page.getByText("มีการแก้ไข 1 จุดที่ยังไม่บันทึก")).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("button", { name: "บันทึกการแก้ไข" }).click();
    await page.waitForURL(/\/dashboard\/listings$/);
    await page.goto("/dashboard/listings?status=published&sort=-updatedAt");
    await waitForData(page);
    await expect(page.getByText("คอนโดแต่งใหม่ ใกล้รถไฟฟ้า พร้อมอยู่").filter({ visible: true }).first()).toBeVisible();
  });
});

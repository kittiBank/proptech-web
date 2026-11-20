import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signIn, waitForData } from "./helpers";

/** FE-14: chats, viewing requests and appointments in a real browser (polling, sheets, axe). */
async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test.describe("messages (signed in)", () => {
  test.beforeEach(async ({ page }) => signIn(page));

  test("chat list and a chat pass axe; a reply arrives by polling", async ({ page, isMobile }) => {
    await page.goto("/messages");
    await waitForData(page);
    await expectNoViolations(page);

    await page.getByRole("list", { name: "รายการแชต" }).getByRole("link").first().click();
    await expect(page).toHaveURL(/\/messages\/t-/);
    const chat = page.getByRole("region", { name: /แชตกับ/ });
    await expect(chat).toBeVisible();
    await waitForData(page);
    await expectNoViolations(page);
    if (isMobile) await expect(page.getByRole("navigation", { name: "เมนูล่าง" })).toHaveCount(0);

    await page.getByLabel("พิมพ์ข้อความ").fill("สะดวกคุยตอนเย็นค่ะ");
    await page.getByLabel("พิมพ์ข้อความ").press("Enter");
    await expect(chat.getByText("สะดวกคุยตอนเย็นค่ะ")).toBeVisible();
    // The mock lister answers ~4s later; the open chat polls every 5s.
    await expect(chat.getByText("อ่านแล้ว")).toBeVisible({ timeout: 15_000 });
  });

  test("requests a viewing from the sheet and sees it in appointments", async ({ page }) => {
    await page.goto("/messages/t-3");
    await page.getByRole("button", { name: "ขอนัดดูห้อง" }).first().click();
    const dialog = page.getByRole("dialog", { name: "ขอนัดดูห้อง" });
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("group", { name: /^เวลาว่าง/ })
      .getByRole("button", { disabled: false })
      .first()
      .click();
    await expectNoViolations(page);
    await dialog.getByRole("button", { name: /^ส่งคำขอนัด/ }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("article", { name: /คำขอนัดดูทรัพย์/ }).last()).toContainText("รอยืนยัน");

    await page.goto("/account/appointments");
    await page.getByRole("tab", { name: /รอยืนยัน/ }).click();
    await expect(page.getByRole("tabpanel").getByRole("article")).toHaveCount(2);
    await expectNoViolations(page);
  });
});

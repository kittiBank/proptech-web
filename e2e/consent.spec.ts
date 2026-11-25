import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { waitForData } from "./helpers";

/** FE-18: help, legal and the report dialog pass axe; the cookie banner asks once and is remembered. */
async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test.describe("cookie banner (no choice yet)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("passes axe, and a rejection is remembered across pages", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByRole("region", { name: "การใช้คุกกี้" });
    await expect(banner).toBeVisible();
    await waitForData(page);
    await expectNoViolations(page);
    await banner.getByRole("button", { name: "ปฏิเสธที่ไม่จำเป็น" }).click();
    await expect(banner).toBeHidden();
    await page.goto("/help");
    await expect(page.getByRole("heading", { level: 1, name: "ศูนย์ช่วยเหลือ" })).toBeVisible();
    await expect(page.getByRole("region", { name: "การใช้คุกกี้" })).toBeHidden();
  });

  test("preferences dialog passes axe and saves", async ({ page }) => {
    await page.goto("/legal/cookies");
    await page.getByRole("region", { name: "การใช้คุกกี้" }).getByRole("button", { name: "ตั้งค่าเอง" }).click();
    const dialog = page.getByRole("dialog", { name: "ตั้งค่าคุกกี้" });
    await expect(dialog.getByRole("switch", { name: "การตลาด" })).toHaveAttribute("aria-checked", "false");
    // Let the fade-in finish, or axe measures half-transparent colours.
    await expect(dialog).toHaveCSS("opacity", "1");
    await expectNoViolations(page);
    await dialog.getByRole("button", { name: "บันทึกการตั้งค่า" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("region", { name: "การใช้คุกกี้" })).toBeHidden();
  });
});

test("report dialog opens from ?report=1, passes axe and sends", async ({ page }) => {
  await page.goto("/property/listing-2012?report=1");
  const dialog = page.getByRole("dialog", { name: "แจ้งประกาศนี้" });
  await expect(dialog).toBeVisible();
  await waitForData(page);
  await expect(dialog).toHaveCSS("opacity", "1");
  await expectNoViolations(page);
  await dialog.getByText("ขายหรือปล่อยเช่าไปแล้ว").click();
  await dialog.getByRole("button", { name: "ส่งรายงาน" }).click();
  await expect(page.getByRole("status").filter({ hasText: "ได้รับรายงานแล้ว" })).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/property\/listing-2012$/);
});

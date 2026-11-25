import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signIn, waitForData } from "./helpers";

/** FE-15: seller dashboard pages pass axe, and the main lister flows work in a real browser. */
const pages = [
  { name: "overview", path: "/dashboard", heading: /^สวัสดี/ },
  { name: "listings", path: "/dashboard/listings", heading: "ประกาศของฉัน" },
  { name: "leads", path: "/dashboard/leads", heading: "ผู้สนใจและนัดหมาย" },
];

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test.describe("seller dashboard (signed in)", () => {
  test.beforeEach(async ({ page }) => signIn(page));

  for (const { name, path, heading } of pages) {
    test(`${name} has no WCAG 2.1 AA violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await waitForData(page);
      await expectNoViolations(page);
    });
  }

  test("?boost= opens the boost dialog, and closing it clears the URL", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForData(page);
    await page
      .getByRole("link", { name: /^โปรโมต/ })
      .first()
      .click();
    const dialog = page.getByRole("dialog", { name: "โปรโมต 1 ประกาศ" });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/listings\?boost=sl-/);
    await waitForData(page);
    await expectNoViolations(page);
    await dialog.getByRole("button", { name: "ยกเลิก" }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/dashboard\/listings$/);
  });

  test("the lister confirms a viewing request", async ({ page }) => {
    await page.goto("/dashboard/leads");
    const card = page.getByRole("article", { name: "คำขอจาก ธีรภัทร วงศ์ใหญ่" });
    await card.getByRole("button", { name: /^ยืนยัน อา\./ }).click();
    await expect(page.getByRole("status").filter({ hasText: "ยืนยันนัดแล้ว" })).toBeVisible();
    await expect(card).toBeHidden();
    await page.getByRole("tab", { name: /นัดที่ยืนยันแล้ว/ }).click();
    await expect(page.getByRole("article", { name: /^ธีรภัทร วงศ์ใหญ่/ })).toBeVisible();
  });
});

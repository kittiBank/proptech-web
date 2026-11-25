import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signIn, waitForData } from "./helpers";

/** FE-16: billing and checkout pass axe, and a PromptPay top-up confirms by itself. */
async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test.describe("billing (signed in)", () => {
  test.beforeEach(async ({ page }) => signIn(page));

  test("billing has no WCAG 2.1 AA violations", async ({ page }) => {
    await page.goto("/dashboard/billing");
    await expect(page.getByRole("heading", { level: 1, name: "การชำระเงินและใบกำกับภาษี" })).toBeVisible();
    await waitForData(page);
    await expectNoViolations(page);
  });

  test("tops up credit with PromptPay", async ({ page }) => {
    await page.goto("/dashboard/billing");
    await waitForData(page);
    await page.getByRole("button", { name: "เติมเครดิต" }).click();
    const dialog = page.getByRole("dialog", { name: "เติมเครดิต" });
    await dialog.getByText("฿500", { exact: true }).click();
    await dialog.getByRole("button", { name: "ไปชำระเงิน ฿500" }).click();

    await expect(page).toHaveURL(/\/checkout\/o-/);
    await expect(page.getByRole("heading", { level: 1, name: "ชำระเงิน" })).toBeVisible();
    await waitForData(page);
    await expectNoViolations(page);
    await page.getByRole("button", { name: "แสดง QR ชำระ ฿500.00" }).click();
    await expect(page.getByRole("img", { name: /QR PromptPay/ })).toBeVisible();
    // The mock bank confirms ~6s later; the page polls every 2s.
    await expect(page.getByRole("heading", { name: "ชำระเงินสำเร็จ" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("link", { name: "ทำต่อ" }).click();
    await expect(page.getByRole("main").getByText("฿1,750", { exact: true })).toBeVisible();
  });
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { waitForData } from "./helpers";

/** Keyboard paths and overlay states that a static page scan does not reach. */

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test.describe("keyboard", () => {
  test.skip(({ isMobile }) => isMobile, "keyboard paths are desktop-only");

  test("the first Tab reaches the skip link, which jumps to main", async ({ page }) => {
    await page.goto("/search?mode=buy");
    await waitForData(page);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "ข้ามไปยังเนื้อหาหลัก" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("buy/rent in the hero search is a radio group driven by arrow keys", async ({ page }) => {
    await page.goto("/");
    const buy = page.getByRole("radio", { name: "ซื้อ" });
    const rent = page.getByRole("radio", { name: "เช่า" });
    await expect(buy).toHaveAttribute("aria-checked", "true");
    await buy.focus();
    await page.keyboard.press("ArrowRight");
    await expect(rent).toBeFocused();
    await page.keyboard.press("Space");
    await expect(rent).toHaveAttribute("aria-checked", "true");
  });

  test("the login modal traps focus, passes axe, and Escape returns focus", async ({ page }) => {
    await page.goto("/guides");
    await waitForData(page);
    const opener = page.getByRole("banner").getByRole("link", { name: "เข้าสู่ระบบ" });
    await opener.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(":focus")).toHaveCount(1);
    await expectNoViolations(page);
    for (let i = 0; i < 15; i++) await page.keyboard.press("Tab");
    await expect(dialog.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/guides$/);
    await expect(opener).toBeFocused();
  });
});

test.describe("overlays (mobile)", () => {
  test.skip(({ isMobile }) => !isMobile, "the filter sheet is the phone layout");

  test("the search filter sheet passes axe and closes with Escape", async ({ page }) => {
    await page.goto("/search?mode=buy");
    await waitForData(page);
    await page.getByRole("button", { name: /^ตัวกรอง/ }).click();
    const sheet = page.getByRole("dialog", { name: "ตัวกรอง" });
    await expect(sheet).toBeVisible();
    await expectNoViolations(page);
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });
});

import { expect, test } from "@playwright/test";
import { waitForData } from "./helpers";

/** FE-12: the phone bottom nav and where it steps aside. */
test.describe("bottom nav (mobile)", () => {
  test.skip(({ isMobile }) => !isMobile, "the bottom nav is the phone layout");

  test("marks the current tab and hides while the filter sheet is open", async ({ page }) => {
    await page.goto("/search?mode=buy");
    await waitForData(page);
    const nav = page.getByRole("navigation", { name: "เมนูล่าง" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "ค้นหา" })).toHaveAttribute("aria-current", "page");

    await page.getByRole("button", { name: /^ตัวกรอง/ }).click();
    await expect(page.getByRole("dialog", { name: "ตัวกรอง" })).toBeVisible();
    await expect(nav).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(nav).toBeVisible();

    await nav.getByRole("link", { name: "รายการโปรด" }).click();
    await expect(page).toHaveURL(/\/account\/favorites$/);
    await expect(
      page.getByRole("navigation", { name: "เมนูล่าง" }).getByRole("link", { name: "รายการโปรด" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("gives way to a page's own action bar", async ({ page }) => {
    await page.goto("/property/listing-2012");
    await waitForData(page);
    await expect(page.getByRole("region", { name: "ติดต่อด่วน" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "เมนูล่าง" })).toHaveCount(0);
  });
});

test("search with no results suggests looser filters with counts (D11)", async ({ page }) => {
  await page.goto("/search?mode=buy&type=condo&q=no-such-place-xyz");
  await expect(page.getByRole("heading", { name: "ยังไม่มีประกาศที่ตรงทุกเงื่อนไข" })).toBeVisible();
  const suggestion = page.getByRole("link", { name: /ไม่ใช้คำค้น/ });
  await expect(suggestion).toContainText(/\d+ ประกาศ/);
  await suggestion.click();
  await expect(page).toHaveURL(/\/search\?mode=buy&type=condo$/);
  await expect(page.getByRole("button", { name: "รับแจ้งเตือน" })).toHaveCount(0);
});

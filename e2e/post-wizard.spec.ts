import { expect, test, type Page } from "@playwright/test";
import { DEMO_ACCOUNT } from "../src/mocks/constants";

/**
 * Posting wizard inputs in a real browser. jsdom fires events synchronously,
 * so it cannot catch inputs that lag a tick behind their state: fast typing,
 * Thai keyboards and mobile keyboards that commit a whole word at once.
 */
test.skip(({ isMobile }) => isMobile, "input behaviour is the same on both; desktop keeps it fast");

/** Next keeps hidden copies of earlier step pages; act on the visible one. */
const wizard = (page: Page) => page.locator("main#main").filter({ visible: true });
const choose = (page: Page, name: string) =>
  wizard(page)
    .getByRole("radio", { name })
    .evaluate((el) => ((el.closest("label") ?? el) as HTMLElement).click());

async function openDetailsStep(page: Page) {
  await page.goto("/login");
  await page.getByLabel("อีเมล", { exact: true }).fill(DEMO_ACCOUNT.email);
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill(DEMO_ACCOUNT.password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));

  await page.goto("/post");
  await page.waitForURL(/\/type$/);
  await choose(page, "คอนโด");
  await page.getByRole("button", { name: "ถัดไป" }).click();
  await page.waitForURL(/\/location$/);
  await wizard(page).getByRole("combobox", { name: "ชื่อโครงการหรือที่อยู่" }).fill("แอสเตอร์");
  await page
    .getByRole("option", { name: /แอสเตอร์/ })
    .first()
    .click();
  await page.getByRole("button", { name: "ถัดไป" }).click();
  await page.waitForURL(/\/details$/);
}

test("fields keep every character typed, fast and in Thai", async ({ page }) => {
  await openDetailsStep(page);
  const title = wizard(page).getByLabel(/หัวข้อประกาศ/);

  await title.click();
  await page.keyboard.type("ขายคอนโดวิวสวย ใกล้ BTS", { delay: 0 });
  await expect(title).toHaveValue("ขายคอนโดวิวสวย ใกล้ BTS");

  // Mobile and Thai keyboards often commit whole words.
  await title.fill("");
  for (const word of ["ขาย", "คอนโด", " ", "วิวสวย"]) await page.keyboard.insertText(word);
  await expect(title).toHaveValue("ขายคอนโด วิวสวย");

  // The live preview follows the same value.
  await expect(page.getByRole("complementary", { name: "ตัวอย่างประกาศ" })).toContainText("ขายคอนโด วิวสวย");
});

test("number fields take decimals, ignore stray keys and read Thai digits", async ({ page }) => {
  await openDetailsStep(page);
  const area = wizard(page).getByLabel(/พื้นที่ใช้สอย/);
  await area.click();
  await page.keyboard.type("35.5", { delay: 0 });
  await expect(area).toHaveValue("35.5");

  await area.fill("");
  await page.keyboard.type("1a2", { delay: 0 });
  await expect(area).toHaveValue("12");

  const floor = wizard(page).getByLabel(/อยู่ชั้น/);
  await floor.click();
  await page.keyboard.type("-๑๒", { delay: 0 });
  await expect(floor).toHaveValue("12");
});

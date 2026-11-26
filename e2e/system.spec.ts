import { expect, test } from "@playwright/test";
import { signIn, waitForData } from "./helpers";

test.describe("system pages (FE-19)", () => {
  test("unknown pages answer 404 with a search and popular stations (D8)", async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "ไม่พบหน้าที่คุณหา" })).toBeVisible();
    await page.getByRole("searchbox", { name: "ค้นหาประกาศ" }).fill("ทองหล่อ");
    await page.getByRole("button", { name: "ค้นหา", exact: true }).click();
    await page.waitForURL(/\/search\?q=/);
  });

  test("unknown listings answer 404", async ({ page }) => {
    const response = await page.goto("/property/no-such-listing");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "ไม่พบหน้าที่คุณหา" })).toBeVisible();
  });

  test("a sold listing is kept out of search engines and offers similar listings (D9)", async ({ page }) => {
    await page.goto("/property/listing-2010");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("heading", { level: 1, name: "ประกาศนี้ขายไปแล้ว" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "ห้องคล้ายกันที่ยังว่าง" })).toBeVisible();
    await expect(page).toHaveTitle(/^ประกาศนี้ขายไปแล้ว/);
  });

  test("client navigation to a closed listing still shows D9", async ({ page }) => {
    await page.goto("/help");
    await page.evaluate(() => {
      const a = document.createElement("a");
      a.href = "/property/listing-2010";
      a.textContent = "closed listing";
      document.querySelector("main")?.append(a);
    });
    await page.getByRole("link", { name: "closed listing" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "ประกาศนี้ขายไปแล้ว" })).toBeVisible();
  });

  test("the maintenance page shows the window and a countdown (D10)", async ({ page }) => {
    await page.goto("/maintenance");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("timer")).not.toHaveText("กำลังตรวจสอบเวลา…");
    await expect(page.getByText(/ชดเชยเวลาให้อัตโนมัติ/)).toBeVisible();
  });

  test("offline: banner and saved favorites (D14)", async ({ page, context }) => {
    await signIn(page);
    await page.goto("/account/favorites");
    await waitForData(page);
    const saved = await page.getByRole("article").count();

    await context.setOffline(true);
    await expect(page.getByText("ไม่มีการเชื่อมต่ออินเทอร์เน็ต")).toBeVisible();
    await expect(page.getByText(/แสดงข้อมูลที่บันทึกไว้ในเครื่อง/)).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(saved);
    await expect(page.getByRole("button", { name: "ลองเชื่อมต่ออีกครั้ง" })).toBeVisible();

    await context.setOffline(false);
    await expect(page.getByText("ไม่มีการเชื่อมต่ออินเทอร์เน็ต")).toBeHidden();
    await expect(page.getByText(/แสดงข้อมูลที่บันทึกไว้ในเครื่อง/)).toBeHidden();
  });
});

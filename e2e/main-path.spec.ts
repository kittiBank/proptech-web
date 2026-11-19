import { expect, test } from "@playwright/test";
import { DEMO_ACCOUNT } from "../src/mocks/constants";
import { waitForData } from "./helpers";

/**
 * The main buyer path: search from the home page → open a listing → message
 * the poster. Signed out, so sending goes through the login modal and the
 * message is sent automatically after signing in. Runs on desktop and mobile.
 */
test("search → listing → contact the poster", async ({ page }) => {
  await test.step("search from the home hero", async () => {
    await page.goto("/");
    const form = page.getByRole("search", { name: "ค้นหาอสังหาริมทรัพย์" });
    await form.getByLabel(/ทำเล/).fill("อโศก");
    await form.getByRole("button", { name: "ค้นหา" }).click();
    await expect(page).toHaveURL(/\/search\?.*q=%E0%B8%AD%E0%B9%82%E0%B8%A8%E0%B8%81/);
    await waitForData(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  let title = "";
  await test.step("open the first result", async () => {
    const results = page.getByRole("main").getByRole("listitem").getByRole("article");
    await expect(results.first()).toBeVisible();
    const link = results.first().getByRole("heading", { level: 3 }).getByRole("link");
    title = (await link.textContent())?.trim() ?? "";
    expect(title).not.toBe("");
    await link.click();
    await expect(page).toHaveURL(/\/property\//);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  });

  await test.step("write a message; required fields are checked first", async () => {
    await page.getByRole("button", { name: "ส่งข้อความถึงผู้ลงประกาศ" }).click();
    const form = page.getByRole("form", { name: "ส่งข้อความถึงผู้ลงประกาศ" });
    await form.getByRole("button", { name: "ส่งข้อความ" }).click();
    await expect(form.getByText("กรอกชื่อของคุณ")).toBeVisible();

    await form.getByLabel("ชื่อ", { exact: true }).fill("ทดสอบ อีทูอี");
    await form.getByLabel("เบอร์โทร").fill("0812345678");
    await form.getByLabel("ข้อความ", { exact: true }).fill("สนใจนัดดูห้องเสาร์นี้ครับ");
    await form.getByRole("button", { name: "ส่งข้อความ" }).click();
  });

  await test.step("sign in from the modal; the message is then sent", async () => {
    const dialog = page.getByRole("dialog", { name: "เข้าสู่ระบบเพื่อส่งข้อความ" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "เข้าสู่ระบบด้วยอีเมล" }).click();
    await dialog.getByLabel("อีเมล", { exact: true }).fill(DEMO_ACCOUNT.email);
    await dialog.getByLabel("รหัสผ่าน", { exact: true }).fill(DEMO_ACCOUNT.password);
    await dialog.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "ส่งข้อความแล้ว" })).toBeVisible();
  });
});

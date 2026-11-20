import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signIn, waitForData } from "./helpers";

/** FE-13: signed-in account pages pass axe; /account is the phone menu and forwards desktop to the profile. */
const pages = [
  { name: "profile", path: "/account/profile", heading: "โปรไฟล์และการตั้งค่า" },
  { name: "saved searches", path: "/account/saved-searches", heading: "การค้นหาที่บันทึกไว้" },
  { name: "notifications", path: "/notifications", heading: "การแจ้งเตือน" },
];

test.describe("account (signed in)", () => {
  test.beforeEach(async ({ page }) => signIn(page));

  for (const { name, path, heading } of pages) {
    test(`${name} has no WCAG 2.1 AA violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await waitForData(page);
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }

  test("/account is the phone menu and forwards desktop to the profile", async ({ page, isMobile }) => {
    await page.goto("/account");
    if (isMobile) {
      await expect(page.getByRole("heading", { level: 1, name: "บัญชี" })).toBeVisible();
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(violations.map((v) => v.id)).toEqual([]);
    } else {
      await page.waitForURL(/\/account\/profile$/);
    }
  });
});

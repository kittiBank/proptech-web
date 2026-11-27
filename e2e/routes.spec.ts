import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminSignIn, signIn, waitForData } from "./helpers";

/**
 * FE-25: route and link smoke test. Visits every page in `src/app` (one sample per dynamic
 * route), checks each answers 200, renders an H1 and logs no console errors, then requests
 * every internal link found on those pages and fails if one is missing or lands on "ไม่พบ…".
 *
 * Unknown ids on dynamic routes still answer 200 (the page streams before the data is known),
 * but their metadata says "ไม่พบ…", so the link check reads the `<title>` as well as the status.
 * Add a new route to one of the lists below when you add a page.
 */

const publicPages = [
  "/",
  "/search?mode=buy",
  "/search?mode=rent&view=map",
  "/property/listing-2012",
  "/property/listing-2010",
  "/projects",
  "/projects/aster-sathorn",
  "/agents/kittipat-srisuk",
  "/guides",
  "/guides/resale-condo-checklist",
  "/tools/mortgage",
  "/compare?ids=listing-2012,listing-2013",
  "/pricing",
  "/help",
  "/legal/privacy",
  "/legal/terms",
  "/legal/listing-rules",
  "/legal/cookies",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password?token=demo",
  "/verify-email",
  "/admin/login",
];

const signedInPages = [
  "/account",
  "/account/profile",
  "/account/favorites",
  "/account/saved-searches",
  "/account/appointments",
  "/notifications",
  "/messages",
  "/onboarding",
  "/dashboard",
  "/dashboard/listings",
  "/dashboard/leads",
  "/dashboard/billing",
  "/dashboard/verify",
];

const adminPages = [
  "/admin",
  "/admin/moderation",
  "/admin/reports",
  "/admin/kyc",
  "/admin/users",
  "/admin/revenue",
  "/admin/promo-slots",
  "/admin/cms",
  "/admin/settings/roles",
];

/** Link targets already checked by this worker: path → problem, or null when fine. */
const checked = new Map<string, string | null>();

/** Visits a page and checks it, softly so one run lists every broken page. Returns its internal links. */
async function visit(page: Page, path: string): Promise<string[]> {
  const errors: string[] = [];
  const onConsole = (m: { type(): string; text(): string }) => {
    if (m.type() === "error") errors.push(m.text());
  };
  const onPageError = (e: Error) => errors.push(e.message);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  const response = await page.goto(path);
  expect.soft(response?.status(), `${path}: status`).toBe(200);
  await waitForData(page);
  await expect
    .soft(page.getByRole("heading", { level: 1 }).filter({ visible: true }).first(), `${path}: H1`)
    .toBeVisible();
  await expect.soft(page, `${path}: lands on not-found`).not.toHaveTitle(/^ไม่พบ/);
  expect.soft(errors, `${path}: console errors`).toEqual([]);

  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  return internalLinks(page);
}

async function internalLinks(page: Page): Promise<string[]> {
  const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  return hrefs.filter((h) => h.startsWith("/") && !h.startsWith("//") && !h.startsWith("/mock-api"));
}

/** The first link on the current page whose path matches, e.g. a thread in the inbox. */
async function firstLink(page: Page, pattern: RegExp): Promise<string> {
  const href = (await internalLinks(page)).find((h) => pattern.test(h.split(/[?#]/)[0]));
  expect(href, `no link matching ${pattern} on ${page.url()}`).toBeTruthy();
  return href!;
}

/**
 * Requests each link once (per path; one query sample is enough to prove the route exists)
 * and fails on a 4xx/5xx or a "ไม่พบ…" page.
 */
async function expectLinksResolve(request: APIRequestContext, links: Iterable<string>) {
  const byPath = new Map<string, string>();
  for (const link of links) {
    const url = link.split("#")[0];
    const path = url.split("?")[0];
    if (url && !byPath.has(path)) byPath.set(path, url);
  }
  const todo = [...byPath.entries()].filter(([path]) => !checked.has(path));
  for (let i = 0; i < todo.length; i += 8) {
    await Promise.all(
      todo.slice(i, i + 8).map(async ([path, url]) => {
        const res = await request.get(url);
        const type = res.headers()["content-type"] ?? "";
        const title = type.includes("text/html") ? /<title>([^<]*)<\/title>/.exec(await res.text())?.[1] : undefined;
        const problem = res.status() >= 400 ? `HTTP ${res.status()}` : title?.startsWith("ไม่พบ") ? title : null;
        checked.set(path, problem);
      }),
    );
  }
  const broken = [...byPath.entries()]
    .filter(([path]) => checked.get(path))
    .map(([, url]) => `${url} → ${checked.get(url.split("?")[0])}`);
  expect(broken, "links to missing pages").toEqual([]);
}

test.describe("route and link smoke test (FE-25)", () => {
  test.describe.configure({ timeout: 300_000 });

  test("public pages", async ({ page, request }) => {
    const links = new Set<string>();
    for (const path of publicPages) for (const l of await visit(page, path)) links.add(l);
    await expectLinksResolve(request, links);
  });

  test("signed-in pages", async ({ page, request }) => {
    await signIn(page);
    const links = new Set<string>();
    const add = (ls: string[]) => ls.forEach((l) => links.add(l));
    for (const path of signedInPages) add(await visit(page, path));

    // Dynamic routes, with ids taken from the pages that link to them.
    await page.goto("/messages");
    await waitForData(page);
    add(await visit(page, await firstLink(page, /^\/messages\/[^/]+$/)));

    // Starting a listing creates a draft and opens its first step.
    await page.goto("/post");
    await page.waitForURL(/\/post\/[^/]+\/type$/);
    const draft = new URL(page.url()).pathname.split("/")[2];
    for (const step of ["type", "location", "details", "photos", "publish"]) {
      add(await visit(page, `/post/${draft}/${step}`));
    }
    // The done page needs a sent listing; for an unsent draft it shows its own "not sent" state
    // (and the mock API's 404 in the console), which is enough to prove the route renders.
    await page.goto(`/post/${draft}/done`);
    await expect(page.getByRole("heading", { name: "ไม่พบประกาศที่ส่ง" })).toBeVisible();
    add(await internalLinks(page));

    // Edit mode (FE-24), from the rejected listing's "แก้ไข" button.
    await page.goto("/dashboard/listings?status=rejected");
    await waitForData(page);
    add(await visit(page, await firstLink(page, /^\/dashboard\/listings\/[^/]+\/edit\/type$/)));

    // An order comes from a top-up on the billing page.
    await page.goto("/dashboard/billing");
    await waitForData(page);
    await page.getByRole("button", { name: "เติมเครดิต" }).click();
    const dialog = page.getByRole("dialog", { name: "เติมเครดิต" });
    await dialog.getByText("฿500", { exact: true }).click();
    await dialog.getByRole("button", { name: "ไปชำระเงิน ฿500" }).click();
    await page.waitForURL(/\/checkout\/[^/]+$/);
    add(await visit(page, new URL(page.url()).pathname));

    await expectLinksResolve(request, links);
  });

  test("admin pages", async ({ page, request }) => {
    await adminSignIn(page);
    await page.waitForURL("**/admin");
    const links = new Set<string>();
    const add = (ls: string[]) => ls.forEach((l) => links.add(l));
    for (const path of adminPages) add(await visit(page, path));

    await page.goto("/admin/moderation");
    await waitForData(page);
    add(await visit(page, await firstLink(page, /^\/admin\/moderation\/[^/]+$/)));
    await page.goto("/admin/cms");
    await waitForData(page);
    add(await visit(page, await firstLink(page, /^\/admin\/cms\/[^/]+$/)));

    await expectLinksResolve(request, links);
  });
});

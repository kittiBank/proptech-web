import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { waitForData } from "./helpers";

/**
 * WCAG 2.1 AA scan (axe-core) of the main public pages once their data has
 * loaded. A failure lists each rule, its impact and the offending elements.
 */
const pages = [
  { name: "home", path: "/" },
  { name: "search", path: "/search?mode=buy" },
  { name: "search map", path: "/search?mode=buy&view=map" },
  { name: "search no results", path: "/search?mode=buy&type=condo&q=no-such-place-xyz" },
  { name: "listing", path: "/property/listing-2012" },
  { name: "projects", path: "/projects" },
  { name: "agent", path: "/agents/kittipat-srisuk" },
  { name: "project", path: "/projects/aster-sathorn" },
  { name: "guides", path: "/guides" },
  { name: "article", path: "/guides/resale-condo-checklist" },
  { name: "mortgage calculator", path: "/tools/mortgage" },
  { name: "login", path: "/login" },
  { name: "register", path: "/register" },
  { name: "seller dashboard (signed out)", path: "/dashboard" },
  { name: "not found", path: "/this-page-does-not-exist" },
];

for (const { name, path } of pages) {
  test(`${name} has no WCAG 2.1 AA violations`, async ({ page }) => {
    await page.goto(path);
    await waitForData(page);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      // Third-party map canvas (MapLibre) controls are outside our markup.
      .exclude(".maplibregl-ctrl")
      .analyze();
    const summary = violations.map((v) => ({
      rule: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.slice(0, 5).map((n) => n.target.join(" ")),
    }));
    expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
  });
}

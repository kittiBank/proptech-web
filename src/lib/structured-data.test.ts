import { describe, expect, it } from "vitest";
import { getArticle } from "@/mocks/articles";
import { getPropertyDetail, queryProperties } from "@/mocks/db";
import type { ArticleDetailDto, PropertyDetailDto } from "@/types/api";
import { metaDescription } from "./site";
import { articleJsonLd, breadcrumbJsonLd, listingJsonLd, serializeJsonLd } from "./structured-data";

/** Round-trips through JSON, as a crawler would read it. */
const parsed = (ld: unknown) => JSON.parse(JSON.stringify(ld));

const firstListing = (mode: "buy" | "rent") =>
  getPropertyDetail(queryProperties({ mode, type: "condo", limit: 1 }).data[0].slug) as PropertyDetailDto;

describe("listingJsonLd", () => {
  it("describes a sale listing as a RealEstateListing with a THB offer", () => {
    const p = firstListing("buy");
    const ld = parsed(listingJsonLd(p));
    expect(ld["@type"]).toBe("RealEstateListing");
    expect(ld.url).toMatch(new RegExp(`/property/${p.slug}$`));
    expect(ld.offers).toMatchObject({ price: p.price, priceCurrency: "THB" });
    expect(ld.offers.businessFunction).toMatch(/#Sell$/);
    expect(ld.offers.itemOffered).toMatchObject({ "@type": "Apartment", numberOfBedrooms: p.bedrooms });
    expect(ld.offers.priceSpecification).toBeUndefined();
  });

  it("marks rentals as monthly leases", () => {
    const ld = parsed(listingJsonLd(firstListing("rent")));
    expect(ld.offers.businessFunction).toMatch(/#LeaseOut$/);
    expect(ld.offers.priceSpecification.unitCode).toBe("MON");
  });
});

describe("articleJsonLd", () => {
  it("uses the article's headline and dates", () => {
    const a = getArticle("resale-condo-checklist") as ArticleDetailDto;
    expect(articleJsonLd(a)).toMatchObject({ "@type": "Article", headline: a.title, datePublished: a.publishedAt });
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers items from 1 with absolute URLs", () => {
    const ld = parsed(breadcrumbJsonLd([{ name: "บทความ", path: "/guides" }]));
    expect(ld.itemListElement[0]).toMatchObject({ position: 1, name: "บทความ" });
    expect(ld.itemListElement[0].item).toMatch(/^https?:\/\/.+\/guides$/);
  });
});

describe("serializeJsonLd", () => {
  it("escapes < so text cannot close the script tag", () => {
    expect(serializeJsonLd({ name: "</script><b>" })).not.toContain("<");
  });
});

describe("metaDescription", () => {
  it("keeps short text and trims long text with an ellipsis", () => {
    expect(metaDescription("  สั้น  ๆ ")).toBe("สั้น ๆ");
    const long = metaDescription("คำ ".repeat(100), 50);
    expect(long.length).toBeLessThanOrEqual(51);
    expect(long.endsWith("…")).toBe(true);
  });
});

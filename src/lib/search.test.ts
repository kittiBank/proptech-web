import { describe, expect, it } from "vitest";
import type { SearchFilters } from "@/types/property";
import { defaultFilters, describeFilters, findStation, toPropertyQuery, toSearchParams } from "./search";

const filters = (override: Partial<SearchFilters>): SearchFilters => ({ ...defaultFilters, ...override });

describe("toPropertyQuery", () => {
  it("asks for everything when nothing is searched", () => {
    expect(toPropertyQuery(null)).toEqual({});
  });

  it("maps the hero search onto API query fields", () => {
    expect(
      toPropertyQuery(
        filters({ mode: "rent", keyword: "  อารีย์ ", type: "condo", station: "N5", priceRange: "15-30k" }),
      ),
    ).toEqual({ mode: "rent", q: "อารีย์", type: "condo", station: "N5", minPrice: 15_000, maxPrice: 30_000 });
  });

  it("leaves out open-ended price bounds", () => {
    expect(toPropertyQuery(filters({ priceRange: "20m+" }))).toEqual({ mode: "buy", minPrice: 20_000_000 });
  });

  it("lets a type tab override the hero type", () => {
    expect(toPropertyQuery(filters({ type: "condo" }), { type: "house" }).type).toBe("house");
    expect(toPropertyQuery(filters({ type: "condo" }), { type: "all" }).type).toBe("condo");
    expect(toPropertyQuery(null, { type: "land" })).toEqual({ type: "land" });
  });
});

describe("toSearchParams", () => {
  it("omits default values", () => {
    expect(toSearchParams(defaultFilters).toString()).toBe("mode=buy");
  });

  it("serialises every set filter", () => {
    const params = toSearchParams(
      filters({ mode: "rent", keyword: "  อารีย์ ", type: "condo", station: "N5", priceRange: "15-30k" }),
    );
    expect(Object.fromEntries(params)).toEqual({
      mode: "rent",
      q: "อารีย์",
      type: "condo",
      station: "N5",
      price: "15-30k",
    });
  });
});

describe("findStation / describeFilters", () => {
  it("labels BTS and MRT stations by system", () => {
    expect(findStation("E4")?.system).toBe("BTS");
    expect(findStation("BL20")?.system).toBe("MRT");
    expect(findStation("nope")).toBeUndefined();
  });

  it("builds a readable Thai summary", () => {
    const text = describeFilters(filters({ mode: "buy", type: "condo", station: "E4" }));
    expect(text.startsWith("ซื้อ คอนโด ใกล้ BTS")).toBe(true);
  });
});

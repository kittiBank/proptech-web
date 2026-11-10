import { describe, expect, it } from "vitest";
import { properties } from "@/data/properties";
import type { SearchFilters } from "@/types/property";
import { defaultFilters, describeFilters, filterProperties, findStation, toSearchParams } from "./search";

const filters = (override: Partial<SearchFilters>): SearchFilters => ({ ...defaultFilters, ...override });

describe("filterProperties", () => {
  it("returns only listings for the chosen mode", () => {
    const rent = filterProperties(properties, filters({ mode: "rent" }));
    expect(rent.length).toBeGreaterThan(0);
    expect(rent.every((p) => p.mode === "rent")).toBe(true);
  });

  it("applies the price bracket for the mode", () => {
    const result = filterProperties(properties, filters({ mode: "buy", priceRange: "0-3m" }));
    expect(result.every((p) => p.price <= 3_000_000)).toBe(true);
  });

  it("matches every keyword term, case-insensitively", () => {
    const [sample] = properties.filter((p) => p.mode === "buy" && p.station);
    const result = filterProperties(properties, filters({ keyword: sample.station!.code.toLowerCase() }));
    expect(result).toContainEqual(sample);
  });

  it("returns nothing when no listing matches", () => {
    expect(filterProperties(properties, filters({ keyword: "no-such-place-xyz" }))).toEqual([]);
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

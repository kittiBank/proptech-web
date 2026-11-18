import { describe, expect, it } from "vitest";
import { getPropertyDetail } from "@/mocks/db";
import type { PropertyDetail } from "@/types/property";
import { buildCompareGroups, countSameRows, onlyDifferences, parseCompareIds } from "./compare";

const base = getPropertyDetail("penthouse-thonglor-river-skyline") as PropertyDetail;

function listing(over: Partial<PropertyDetail>): PropertyDetail {
  return { ...base, ...over, location: { ...base.location, ...over.location } };
}

const row = (groups: ReturnType<typeof buildCompareGroups>, key: string) =>
  groups.flatMap((g) => g.rows).find((r) => r.key === key)!;

describe("buildCompareGroups", () => {
  const a = listing({ id: "a", mode: "buy", price: 9_200_000, area: 72, commonFee: 4320, facilities: [] });
  const b = listing({ id: "b", mode: "buy", price: 6_480_000, area: 38, commonFee: 2280, facilities: ["pet"] });

  it("marks the best column per ranked row", () => {
    const groups = buildCompareGroups([a, b]);
    expect(row(groups, "price").best).toEqual([false, true]);
    expect(row(groups, "psm").best).toEqual([true, false]);
    expect(row(groups, "area").best).toEqual([true, false]);
    expect(row(groups, "pet").best).toEqual([false, true]);
    expect(row(groups, "rooms").best).toEqual([false, false]);
  });

  it("does not rank price across sale and rent", () => {
    const rent = listing({ id: "c", mode: "rent", price: 30_000 });
    expect(row(buildCompareGroups([a, rent]), "price").best).toEqual([false, false]);
  });

  it("has no winner when values tie", () => {
    const groups = buildCompareGroups([a, listing({ id: "d", price: a.price, area: a.area, mode: "buy" })]);
    expect(row(groups, "price").best).toEqual([false, false]);
    expect(row(groups, "price").same).toBe(true);
  });

  it("hides identical rows and counts them", () => {
    const groups = buildCompareGroups([a, b]);
    const diff = onlyDifferences(groups);
    expect(diff.flatMap((g) => g.rows).every((r) => !r.same)).toBe(true);
    expect(countSameRows(groups)).toBe(groups.flatMap((g) => g.rows).length - diff.flatMap((g) => g.rows).length);
  });
});

describe("parseCompareIds", () => {
  it("dedupes, trims and caps", () => {
    expect(parseCompareIds(" a,b,,a,c,d ", 3)).toEqual(["a", "b", "c"]);
    expect(parseCompareIds(null, 3)).toEqual([]);
  });
});

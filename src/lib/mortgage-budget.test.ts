import { describe, expect, it } from "vitest";
import { budgetListQuery, budgetPriceRange } from "./mortgage-budget";

describe("budgetPriceRange", () => {
  it("picks the sale bracket that holds the price", () => {
    expect(budgetPriceRange(2_500_000).value).toBe("0-3m");
    expect(budgetPriceRange(9_200_000).value).toBe("5-10m");
    expect(budgetPriceRange(35_000_000).value).toBe("20m+");
  });

  it("puts a boundary price in the lower bracket", () => {
    expect(budgetPriceRange(5_000_000).value).toBe("3-5m");
  });
});

describe("budgetListQuery", () => {
  it("asks GET /properties for the same bracket", () => {
    expect(budgetListQuery(9_200_000)).toEqual({ mode: "buy", minPrice: 5_000_000, maxPrice: 10_000_000, limit: 1 });
  });
});

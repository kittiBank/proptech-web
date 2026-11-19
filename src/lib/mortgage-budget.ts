import { priceRanges } from "@/data/catalog";
import type { ListPropertiesQuery } from "@/types/api";
import type { PriceRangeOption } from "@/types/property";

/**
 * The /search sale price bracket that holds `price`, so "ดูประกาศในงบ" lands on
 * a filter the search page understands. A price on a boundary (e.g. 5 ล้าน)
 * goes to the lower bracket, whose upper bound it equals.
 */
export function budgetPriceRange(price: number): PriceRangeOption {
  const brackets = priceRanges.buy.filter((r) => r.value !== "any");
  return brackets.find((r) => r.max === undefined || price <= r.max) ?? brackets[brackets.length - 1];
}

/** `GET /properties` filter for the same bracket, used to show how many listings it has. */
export function budgetListQuery(price: number): ListPropertiesQuery {
  const range = budgetPriceRange(price);
  return { mode: "buy", minPrice: range.min, maxPrice: range.max, limit: 1 };
}

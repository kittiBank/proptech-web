import { describe, expect, it } from "vitest";
import {
  defaultProjectsState,
  hasProjectFilters,
  parseProjectsParams,
  toProjectsQuery,
  toProjectsQueryString,
  updateProjectsState,
} from "./project-params";

describe("project params", () => {
  it("round-trips through the query string and drops defaults", () => {
    const state = { ...defaultProjectsState, status: "ready", line: "mrt-blue", price: "3-5m", page: 2 } as const;
    const qs = toProjectsQueryString(state);
    expect(qs).toBe("status=ready&line=mrt-blue&price=3-5m&page=2");
    expect(parseProjectsParams(new URLSearchParams(qs))).toEqual(state);
    expect(toProjectsQueryString(defaultProjectsState)).toBe("");
  });

  it("falls back to defaults for unknown values", () => {
    expect(parseProjectsParams(new URLSearchParams("status=nope&type=land&page=-3"))).toEqual(defaultProjectsState);
  });

  it("resets the page when a filter changes", () => {
    const next = updateProjectsState({ ...defaultProjectsState, page: 3 }, { type: "condo" });
    expect(next.page).toBe(1);
    expect(hasProjectFilters(next)).toBe(true);
  });

  it("maps state to the API query", () => {
    expect(toProjectsQuery({ ...defaultProjectsState, price: "10m+", sort: "price-asc" })).toMatchObject({
      minPrice: 10_000_000,
      maxPrice: undefined,
      sort: "startingPrice",
      status: undefined,
      limit: 9,
    });
  });
});

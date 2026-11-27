import { describe, expect, it } from "vitest";
import {
  clearSearchFilters,
  countActiveFilters,
  defaultSearchState,
  describeSearch,
  legacySearchRedirect,
  parseSearchParams,
  SEARCH_PAGE_SIZE,
  toListQuery,
  toSearchQueryString,
  updateSearchState,
  type SearchState,
} from "./search-params";

const parse = (query: string) => parseSearchParams(new URLSearchParams(query));
const state = (override: Partial<SearchState>): SearchState => ({ ...defaultSearchState, ...override });

describe("parseSearchParams", () => {
  it("falls back to defaults for an empty URL", () => {
    expect(parse("")).toEqual(defaultSearchState);
  });

  it("reads every field", () => {
    expect(
      parse("mode=rent&q=อารีย์&type=condo&station=N5,e4&price=15-30k&beds=2&area=35-60&sort=station&page=3&view=map"),
    ).toEqual({
      mode: "rent",
      keyword: "อารีย์",
      type: "condo",
      stations: ["N5", "E4"],
      price: "15-30k",
      bedrooms: "2",
      area: "35-60",
      sort: "station",
      page: 3,
      view: "map",
    });
  });

  it("drops unknown or malformed values", () => {
    expect(parse("mode=lease&type=castle&station=E4,,<x>,E4&beds=9&area=huge&sort=random&page=-2&view=3d")).toEqual(
      state({ stations: ["E4"] }),
    );
    expect(parse("page=1.5").page).toBe(1);
  });

  it("drops a price bracket that belongs to the other mode", () => {
    expect(parse("mode=rent&price=3-5m").price).toBe("any");
    expect(parse("mode=buy&price=3-5m").price).toBe("3-5m");
  });

  it("reads the query string the homepage search builds", () => {
    expect(parse("mode=buy&q=สาทร&type=house&station=S3&price=5-10m")).toMatchObject({
      keyword: "สาทร",
      type: "house",
      stations: ["S3"],
      price: "5-10m",
    });
  });
});

describe("toSearchQueryString", () => {
  it("leaves out defaults", () => {
    expect(toSearchQueryString(defaultSearchState)).toBe("mode=buy");
  });

  it("round-trips through parseSearchParams", () => {
    const full = state({
      mode: "rent",
      keyword: "ริมน้ำ",
      type: "condo",
      stations: ["E4", "BL20"],
      price: "30-60k",
      bedrooms: "1",
      area: "60-100",
      sort: "price-desc",
      page: 2,
      view: "map",
    });
    const query = toSearchQueryString(full);
    expect(query).toContain("station=E4,BL20");
    expect(parse(query)).toEqual(full);
  });
});

describe("updateSearchState", () => {
  it("returns to page 1 when a filter changes", () => {
    expect(updateSearchState(state({ page: 4 }), { type: "land" }).page).toBe(1);
    expect(updateSearchState(state({ page: 4 }), { sort: "price-asc" }).page).toBe(1);
  });

  it("keeps the page when only the page or view changes", () => {
    expect(updateSearchState(state({ page: 4 }), { view: "map" }).page).toBe(4);
    expect(updateSearchState(state({ page: 4 }), { page: 5 }).page).toBe(5);
  });

  it("clears the price bracket when switching Buy/Rent", () => {
    expect(updateSearchState(state({ price: "3-5m" }), { mode: "rent" }).price).toBe("any");
    expect(updateSearchState(state({ price: "3-5m" }), { mode: "buy" }).price).toBe("3-5m");
  });
});

describe("clearSearchFilters / countActiveFilters", () => {
  const busy = state({
    mode: "rent",
    keyword: "x",
    type: "condo",
    stations: ["E4", "N5"],
    bedrooms: "2",
    sort: "price-asc",
    view: "map",
    page: 3,
  });

  it("counts each station separately and ignores the keyword", () => {
    expect(countActiveFilters(defaultSearchState)).toBe(0);
    expect(countActiveFilters(busy)).toBe(4);
  });

  it("keeps mode, sort and view", () => {
    expect(clearSearchFilters(busy)).toEqual(state({ mode: "rent", sort: "price-asc", view: "map" }));
  });
});

describe("toListQuery", () => {
  it("asks for the first page, newest first, by default", () => {
    expect(toListQuery(defaultSearchState)).toEqual({
      mode: "buy",
      sort: "-postedAt",
      page: 1,
      limit: SEARCH_PAGE_SIZE,
    });
  });

  it("maps brackets to numeric bounds", () => {
    expect(
      toListQuery(
        state({ stations: ["E4", "N5"], price: "20m+", bedrooms: "3", area: "35-60", sort: "station", page: 2 }),
      ),
    ).toEqual({
      mode: "buy",
      station: "E4,N5",
      minPrice: 20_000_000,
      minBedrooms: 3,
      minArea: 35,
      maxArea: 60,
      sort: "stationDistance",
      page: 2,
      limit: SEARCH_PAGE_SIZE,
    });
  });
});

describe("describeSearch", () => {
  it("names the deal, type and stations", () => {
    expect(describeSearch(defaultSearchState)).toBe("ซื้ออสังหาฯ");
    expect(describeSearch(state({ mode: "rent", type: "condo", stations: ["E4"] }))).toBe("เช่าคอนโด ใกล้ BTS อโศก");
    expect(describeSearch(state({ stations: ["E4", "N5"] }))).toBe("ซื้ออสังหาฯ ใกล้รถไฟฟ้า 2 สถานี");
  });
});

describe("legacySearchRedirect (FE-23)", () => {
  const redirect = (path: string, query = "") => legacySearchRedirect(path, new URLSearchParams(query));

  it("sends /buy and /rent to /search with the mode", () => {
    expect(redirect("/buy")).toBe("/search?mode=buy");
    expect(redirect("/rent")).toBe("/search?mode=rent");
  });

  it("keeps filters, maps a station id to its code and ignores a conflicting mode", () => {
    expect(redirect("/buy", "type=condo&location=ari&mode=rent&price=3-5m")).toBe(
      "/search?mode=buy&type=condo&station=N5&price=3-5m",
    );
  });

  it("drops an unknown location instead of guessing", () => {
    expect(redirect("/rent", "location=atlantis&type=house")).toBe("/search?mode=rent&type=house");
  });

  it("leaves every other path alone", () => {
    expect(redirect("/search", "mode=buy")).toBeNull();
    expect(redirect("/buyer")).toBeNull();
  });

  it("produces URLs /search reads back as the same filters", () => {
    const url = new URL(redirect("/buy", "type=condo&location=asok")!, "http://x");
    expect(parseSearchParams(url.searchParams)).toMatchObject({ mode: "buy", type: "condo", stations: ["E4"] });
  });
});

import { areaRanges, bedroomOptions, priceRanges, propertyTypeLabels } from "@/data/catalog";
import { findStation, findStationById } from "@/lib/search";
import type { ListPropertiesQuery, PropertySort } from "@/types/api";
import type { ListingMode, PropertyType } from "@/types/property";

/**
 * State of the /search page. The URL is the source of truth: every filter,
 * the sort, the page and the view live in the query string, so a search can
 * be bookmarked, shared and walked through with Back/Forward.
 */
export interface SearchState {
  mode: ListingMode;
  keyword: string;
  type: PropertyType | "all";
  /** Station codes, e.g. ["E4", "N5"]. Empty = any station. */
  stations: string[];
  /** A `priceRanges[mode]` value. */
  price: string;
  /** A `bedroomOptions` value. */
  bedrooms: string;
  /** An `areaRanges` value. */
  area: string;
  sort: SearchSort;
  /** 1-based. */
  page: number;
  view: SearchView;
}

export type SearchSort = "newest" | "price-asc" | "price-desc" | "station";
export type SearchView = "list" | "map";

/** Results per page: 6 rows of the 2- or 3-column grid. */
export const SEARCH_PAGE_SIZE = 18;

export const sortOptions: { value: SearchSort; label: string; api: PropertySort }[] = [
  { value: "newest", label: "ล่าสุด", api: "-postedAt" },
  { value: "price-asc", label: "ราคาต่ำไปสูง", api: "price" },
  { value: "price-desc", label: "ราคาสูงไปต่ำ", api: "-price" },
  { value: "station", label: "ใกล้รถไฟฟ้าที่สุด", api: "stationDistance" },
];

export const defaultSearchState: SearchState = {
  mode: "buy",
  keyword: "",
  type: "all",
  stations: [],
  price: "any",
  bedrooms: "any",
  area: "any",
  sort: "newest",
  page: 1,
  view: "list",
};

const propertyTypes: readonly PropertyType[] = ["condo", "house", "townhouse", "land", "commercial"];
const STATION_CODE = /^[A-Z]{1,3}\d{1,3}$/;

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Reads the page state from the URL. Unknown or malformed values fall back to their defaults. */
export function parseSearchParams(params: Pick<URLSearchParams, "get">): SearchState {
  const mode = pick(params.get("mode"), ["buy", "rent"], defaultSearchState.mode);
  const page = Number(params.get("page"));
  const stations = (params.get("station") ?? "")
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter((code) => STATION_CODE.test(code));

  return {
    mode,
    keyword: params.get("q")?.trim() ?? "",
    type: pick(params.get("type"), ["all", ...propertyTypes], "all"),
    stations: [...new Set(stations)],
    // Price brackets differ between sale and rent; a bracket from the other mode is dropped.
    price: pick(
      params.get("price"),
      priceRanges[mode].map((r) => r.value),
      "any",
    ),
    bedrooms: pick(
      params.get("beds"),
      bedroomOptions.map((o) => o.value),
      "any",
    ),
    area: pick(
      params.get("area"),
      areaRanges.map((r) => r.value),
      "any",
    ),
    sort: pick(
      params.get("sort"),
      sortOptions.map((o) => o.value),
      defaultSearchState.sort,
    ),
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    view: pick(params.get("view"), ["list", "map"], defaultSearchState.view),
  };
}

/** The shareable query string for a state. Defaults are left out to keep URLs short. */
export function toSearchQueryString(state: SearchState): string {
  const params = new URLSearchParams({ mode: state.mode });
  if (state.keyword.trim()) params.set("q", state.keyword.trim());
  if (state.type !== "all") params.set("type", state.type);
  if (state.stations.length) params.set("station", state.stations.join(","));
  if (state.price !== "any") params.set("price", state.price);
  if (state.bedrooms !== "any") params.set("beds", state.bedrooms);
  if (state.area !== "any") params.set("area", state.area);
  if (state.sort !== defaultSearchState.sort) params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  if (state.view !== defaultSearchState.view) params.set("view", state.view);
  // Keep commas in station lists readable.
  return params.toString().replaceAll("%2C", ",");
}

const legacySearchModes: Record<string, ListingMode> = { "/buy": "buy", "/rent": "rent" };

/**
 * `/buy` and `/rent` (older links and bookmarks) live on as redirects to `/search` with the mode set.
 * Other params are kept; `location=<station id>` becomes `station=<code>`, the param `/search` reads.
 * Returns `null` for any other path.
 */
export function legacySearchRedirect(pathname: string, search: URLSearchParams): string | null {
  const mode = legacySearchModes[pathname];
  if (!mode) return null;
  const params = new URLSearchParams({ mode });
  for (const [key, value] of search) {
    if (key === "mode") continue;
    if (key === "location") {
      const code = findStationById(value)?.stationCode;
      if (code) params.set("station", code);
      continue;
    }
    params.append(key, value);
  }
  return `/search?${params.toString().replaceAll("%2C", ",")}`;
}

/**
 * Applies a filter change. Anything that changes the result set returns to
 * page 1; switching Buy/Rent also clears the price bracket, which differs per mode.
 */
export function updateSearchState(state: SearchState, update: Partial<SearchState>): SearchState {
  const next = { ...state, ...update };
  if (update.mode && update.mode !== state.mode && update.price === undefined) next.price = "any";
  const onlyPaging = Object.keys(update).every((key) => key === "page" || key === "view");
  if (!onlyPaging && update.page === undefined) next.page = 1;
  return next;
}

/** Filters only: keeps Buy/Rent, sort and view. */
export function clearSearchFilters(state: SearchState): SearchState {
  return { ...defaultSearchState, mode: state.mode, sort: state.sort, view: state.view };
}

/** How many filters (beyond Buy/Rent and the keyword) are set; shown on the mobile filter button. */
export function countActiveFilters(state: SearchState): number {
  return (
    Number(state.type !== "all") +
    state.stations.length +
    Number(state.price !== "any") +
    Number(state.bedrooms !== "any") +
    Number(state.area !== "any")
  );
}

/** `GET /properties` query for a state. Pinned placements are included: on search they are ordinary results. */
export function toListQuery(state: SearchState): ListPropertiesQuery {
  const query: ListPropertiesQuery = {
    mode: state.mode,
    sort: sortOptions.find((o) => o.value === state.sort)?.api,
    page: state.page,
    limit: SEARCH_PAGE_SIZE,
  };
  if (state.keyword.trim()) query.q = state.keyword.trim();
  if (state.type !== "all") query.type = state.type;
  if (state.stations.length) query.station = state.stations.join(",");
  const price = priceRanges[state.mode].find((r) => r.value === state.price);
  if (price?.min !== undefined) query.minPrice = price.min;
  if (price?.max !== undefined) query.maxPrice = price.max;
  const beds = bedroomOptions.find((o) => o.value === state.bedrooms);
  if (beds?.min !== undefined) query.minBedrooms = beds.min;
  const area = areaRanges.find((r) => r.value === state.area);
  if (area?.min !== undefined) query.minArea = area.min;
  if (area?.max !== undefined) query.maxArea = area.max;
  return query;
}

/** Page heading for a state, e.g. "ซื้อคอนโด ใกล้ BTS อโศก". */
export function describeSearch(state: SearchState): string {
  const verb = state.mode === "buy" ? "ซื้อ" : "เช่า";
  const what = state.type === "all" ? "อสังหาฯ" : propertyTypeLabels[state.type];
  const near =
    state.stations.length === 1
      ? (() => {
          const station = findStation(state.stations[0]);
          return station ? ` ใกล้ ${station.system} ${station.name}` : "";
        })()
      : state.stations.length > 1
        ? ` ใกล้รถไฟฟ้า ${state.stations.length} สถานี`
        : "";
  return `${verb}${what}${near}`;
}

/** One removable chip per active filter (search page, saved searches). */
export function searchCriteria(state: SearchState): { key: string; label: string; clear: Partial<SearchState> }[] {
  const chips: { key: string; label: string; clear: Partial<SearchState> }[] = [];
  if (state.keyword) chips.push({ key: "q", label: `“${state.keyword}”`, clear: { keyword: "" } });
  if (state.type !== "all") chips.push({ key: "type", label: propertyTypeLabels[state.type], clear: { type: "all" } });
  for (const code of state.stations) {
    const station = findStation(code);
    chips.push({
      key: `station-${code}`,
      label: station ? `${station.system} ${station.name}` : code,
      clear: { stations: state.stations.filter((c) => c !== code) },
    });
  }
  const price = priceRanges[state.mode].find((r) => r.value === state.price);
  if (price && state.price !== "any") chips.push({ key: "price", label: price.label, clear: { price: "any" } });
  const beds = bedroomOptions.find((o) => o.value === state.bedrooms);
  if (beds && state.bedrooms !== "any")
    chips.push({ key: "beds", label: `${beds.label} ห้องนอน`, clear: { bedrooms: "any" } });
  const area = areaRanges.find((r) => r.value === state.area);
  if (area && state.area !== "any") chips.push({ key: "area", label: area.label, clear: { area: "any" } });
  return chips;
}

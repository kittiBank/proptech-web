import { priceRanges, propertyTypeLabels } from "@/data/catalog";
import { transitLines } from "@/data/locations";
import type { ListPropertiesQuery } from "@/types/api";
import type { PropertyType, SearchFilters } from "@/types/property";

export const defaultFilters: SearchFilters = {
  mode: "buy",
  keyword: "",
  type: "all",
  station: "any",
  priceRange: "any",
};

/**
 * Turns the hero search (plus the listing type tabs) into a `GET /properties`
 * query. The server does the filtering; see `src/mocks/db.ts` for the mock.
 * A type tab other than "all" takes precedence over the hero's type select.
 */
export function toPropertyQuery(
  filters: SearchFilters | null,
  options: { type?: PropertyType | "all" } = {},
): ListPropertiesQuery {
  const query: ListPropertiesQuery = {};
  if (filters) {
    query.mode = filters.mode;
    if (filters.keyword.trim()) query.q = filters.keyword.trim();
    if (filters.type !== "all") query.type = filters.type;
    if (filters.station !== "any") query.station = filters.station;
    const range = priceRanges[filters.mode].find((r) => r.value === filters.priceRange);
    if (range?.min !== undefined) query.minPrice = range.min;
    if (range?.max !== undefined) query.maxPrice = range.max;
  }
  if (options.type && options.type !== "all") query.type = options.type;
  return query;
}

/** Shareable URL query for the future /search page (the API query is `toPropertyQuery`). */
export function toSearchParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams({ mode: filters.mode });
  if (filters.keyword.trim()) params.set("q", filters.keyword.trim());
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.station !== "any") params.set("station", filters.station);
  if (filters.priceRange !== "any") params.set("price", filters.priceRange);
  return params;
}

export function describeFilters(filters: SearchFilters): string {
  const parts = [filters.mode === "buy" ? "ซื้อ" : "เช่า"];
  if (filters.type !== "all") parts.push(propertyTypeLabels[filters.type]);
  const station = findStation(filters.station);
  if (station) parts.push(`ใกล้ ${station.system} ${station.name}`);
  if (filters.keyword.trim()) parts.push(`“${filters.keyword.trim()}”`);
  const range = priceRanges[filters.mode].find((r) => r.value === filters.priceRange);
  if (range && range.value !== "any") parts.push(range.label);
  return parts.join(" ");
}

export function findStation(code: string) {
  for (const line of transitLines) {
    const s = line.stations.find((st) => st.stationCode === code);
    if (s) return { ...s, line: line.id, system: line.id.startsWith("mrt") ? "MRT" : "BTS" };
  }
  return undefined;
}

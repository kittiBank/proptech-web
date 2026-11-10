import { priceRanges, propertyTypeLabels } from "@/data/catalog";
import { transitLines } from "@/data/locations";
import type { Property, SearchFilters } from "@/types/property";

export const defaultFilters: SearchFilters = {
  mode: "buy",
  keyword: "",
  type: "all",
  station: "any",
  priceRange: "any",
};

function matchesKeyword(property: Property, keyword: string): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    property.title,
    property.projectName,
    property.district,
    property.station?.name,
    property.station?.code,
    property.highlight,
    propertyTypeLabels[property.type],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

export function filterProperties(list: Property[], filters: SearchFilters): Property[] {
  const range = priceRanges[filters.mode].find((r) => r.value === filters.priceRange);
  return list.filter((p) => {
    if (p.mode !== filters.mode) return false;
    if (filters.type !== "all" && p.type !== filters.type) return false;
    if (filters.station !== "any" && p.station?.code !== filters.station) return false;
    if (range?.min !== undefined && p.price < range.min) return false;
    if (range?.max !== undefined && p.price > range.max) return false;
    return matchesKeyword(p, filters.keyword);
  });
}

/** Query string for the future /search page and the NestJS `GET /properties` endpoint. */
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

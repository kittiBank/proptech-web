import { propertyCategories, propertyTypeLabels } from "@/data/catalog";
import { generatedListings } from "@/data/generated-listings";
import { transitLines } from "@/data/locations";
import { newProjects } from "@/data/projects";
import { pinnedPropertyIds, properties } from "@/data/properties";
import {
  PROPERTIES_DEFAULT_LIMIT,
  type ListProjectsQuery,
  type ListPropertiesQuery,
  type ListPropertiesResponse,
  type PropertyDto,
  type PropertySort,
} from "@/types/api";

/**
 * In-memory "database" behind the MSW handlers. It mirrors what the NestJS
 * service will do (filter → sort → paginate) so the UI is built against
 * realistic server behaviour rather than client-side array tricks.
 */

const pinnedIds = new Set(pinnedPropertyIds);

const allListings: PropertyDto[] = [...properties, ...generatedListings].map((p) =>
  pinnedIds.has(p.id) ? { ...p, isPinned: true } : p,
);

/** Paid placements, in the order they were booked. */
const pinnedListings: PropertyDto[] = pinnedPropertyIds
  .map((id) => allListings.find((p) => p.id === id))
  .filter((p): p is PropertyDto => Boolean(p));

export function matchesKeyword(property: PropertyDto, keyword: string): boolean {
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

const comparators: Record<PropertySort, (a: PropertyDto, b: PropertyDto) => number> = {
  "-postedAt": (a, b) => b.postedAt.localeCompare(a.postedAt),
  postedAt: (a, b) => a.postedAt.localeCompare(b.postedAt),
  "-price": (a, b) => b.price - a.price,
  price: (a, b) => a.price - b.price,
};

export function queryProperties(query: ListPropertiesQuery): ListPropertiesResponse {
  const source =
    query.pinned === true
      ? pinnedListings
      : query.pinned === false
        ? allListings.filter((p) => !p.isPinned)
        : allListings;

  const filtered = source.filter((p) => {
    if (query.mode && p.mode !== query.mode) return false;
    if (query.type && p.type !== query.type) return false;
    if (query.station && p.station?.code !== query.station) return false;
    if (query.minPrice !== undefined && p.price < query.minPrice) return false;
    if (query.maxPrice !== undefined && p.price > query.maxPrice) return false;
    return matchesKeyword(p, query.q ?? "");
  });

  // Pinned placements keep their booked order unless a sort is asked for.
  const sort = query.sort ?? (query.pinned ? undefined : "-postedAt");
  const sorted = sort ? [...filtered].sort(comparators[sort]) : filtered;

  const limit = query.limit ?? PROPERTIES_DEFAULT_LIMIT;
  const page = query.page ?? 1;
  return {
    data: sorted.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total: sorted.length, totalPages: Math.max(1, Math.ceil(sorted.length / limit)) },
  };
}

export function queryProjects(query: ListProjectsQuery) {
  // Every mock project is a new launch; `status` is accepted for contract parity.
  void query;
  return { data: newProjects };
}

export function queryStations() {
  return { data: transitLines };
}

export function queryCategories() {
  return { data: propertyCategories };
}

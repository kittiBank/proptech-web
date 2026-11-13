import { advertisements } from "@/data/ads";
import { propertyCategories, propertyTypeLabels } from "@/data/catalog";
import { generatedListings } from "@/data/generated-listings";
import { photosByType } from "@/data/images";
import { transitLines } from "@/data/locations";
import { newProjects } from "@/data/projects";
import { pinnedPropertyIds, properties } from "@/data/properties";
import { buildPropertyDetail, listingPoint } from "@/data/property-details";
import { distanceBetween } from "@/lib/geo";
import {
  PROPERTIES_DEFAULT_LIMIT,
  type ListAdsQuery,
  type ListProjectsQuery,
  type ListPropertiesQuery,
  type ListPropertiesResponse,
  type ListNearbyPropertiesQuery,
  type ListNearbyPropertiesResponse,
  type PropertyDetailDto,
  type PropertyDto,
  type PropertySort,
} from "@/types/api";

/**
 * In-memory "database" behind the MSW handlers. It mirrors what the NestJS
 * service will do (filter → sort → paginate) so the UI is built against
 * realistic server behaviour rather than client-side array tricks.
 */

const pinnedIds = new Set(pinnedPropertyIds);

/** Small stable hash so each listing always gets the same gallery. */
function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/** Cover plus 2–4 more photos of the same property type, and a view count: stand-ins for the media and analytics services. */
function withGallery(property: PropertyDto): PropertyDto {
  const seed = hash(property.id);
  const others = photosByType[property.type].filter((img) => img.src !== property.image.src);
  const count = Math.min(others.length, 2 + (seed % 3));
  const start = seed % Math.max(1, others.length);
  const extra = Array.from({ length: count }, (_, i) => others[(start + i) % others.length]);
  // Stand-in for analytics: paid placements get more traffic.
  const viewCount = (property.isPinned ? 1_500 : 40) + (seed % (property.isPinned ? 6_000 : 2_400));
  return { ...property, gallery: [property.image, ...extra], viewCount };
}

const allListings: PropertyDto[] = [...properties, ...generatedListings].map((p) =>
  withGallery(pinnedIds.has(p.id) ? { ...p, isPinned: true } : p),
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

export function queryAds(query: ListAdsQuery) {
  return { data: advertisements[query.placement] };
}

/** `GET /properties/:slug`. `undefined` = 404. */
export function getPropertyDetail(slug: string): PropertyDetailDto | undefined {
  const property = allListings.find((p) => p.slug === slug);
  return property ? buildPropertyDetail(property) : undefined;
}

export const NEARBY_DEFAULT_LIMIT = 6;
/** Listings further than this are not "nearby". */
const NEARBY_RADIUS_M = 5_000;

/**
 * `GET /properties/:slug/nearby`: closest listings to this one, same deal
 * type (sale or rent) first. `undefined` = the listing itself does not exist.
 */
export function queryNearbyProperties(
  slug: string,
  query: ListNearbyPropertiesQuery = {},
): ListNearbyPropertiesResponse | undefined {
  const origin = allListings.find((p) => p.slug === slug);
  if (!origin) return undefined;
  const from = listingPoint(origin);
  const limit = query.limit ?? NEARBY_DEFAULT_LIMIT;

  const ranked = allListings
    .filter((p) => p.id !== origin.id)
    .map((p) => ({ ...p, distance: distanceBetween(from, listingPoint(p)) }))
    .filter((p) => p.distance <= NEARBY_RADIUS_M)
    .sort((a, b) => Number(b.mode === origin.mode) - Number(a.mode === origin.mode) || a.distance - b.distance);

  return { data: ranked.slice(0, limit) };
}

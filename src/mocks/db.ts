import { advertisements } from "@/data/ads";
import { agentSeeds, findAgentSeed } from "@/data/agents";
import { propertyCategories, propertyTypeLabels } from "@/data/catalog";
import { generatedListings } from "@/data/generated-listings";
import { photosByType } from "@/data/images";
import { transitLines } from "@/data/locations";
import { buildProjectDetail, buildProjectListings, projectPoint } from "@/data/project-details";
import { stationsNear } from "@/data/property-details";
import { newProjects } from "@/data/projects";
import { findPoster } from "@/data/posters";
import { pinnedPropertyIds, properties } from "@/data/properties";
import { buildPropertyDetail, listingPoint } from "@/data/property-details";
import { distanceBetween } from "@/lib/geo";
import {
  PROJECTS_DEFAULT_LIMIT,
  PROPERTIES_DEFAULT_LIMIT,
  type AgentAreaDto,
  type AgentProfileDto,
  type CompareListingsResponse,
  type NearbyStationsResponse,
  type SearchProjectPlacesResponse,
  type ListAdsQuery,
  type ListNearbyProjectsResponse,
  type ListProjectsQuery,
  type ListProjectsResponse,
  type ProjectDetailDto,
  type ProjectDto,
  type ProjectSort,
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
  return { ...property, gallery: [property.image, ...extra], viewCount, point: listingPoint(property) };
}

const allListings: PropertyDto[] = [...properties, ...generatedListings, ...buildProjectListings(newProjects)].map(
  (p) => withGallery(pinnedIds.has(p.id) ? { ...p, isPinned: true } : p),
);

/**
 * Listings that were taken down, sold or rented. They drop out of search but
 * stay readable by id so saved copies in favorites can show the closed state.
 */
export const closedListingIds = new Set(["g-2010", "g-2031"]);

export function findListingById(id: string): PropertyDto | undefined {
  return allListings.find((p) => p.id === id);
}

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
  stationDistance: (a, b) =>
    (a.stationDistance ?? Number.MAX_SAFE_INTEGER) - (b.stationDistance ?? Number.MAX_SAFE_INTEGER) ||
    b.postedAt.localeCompare(a.postedAt),
};

export function queryProperties(query: ListPropertiesQuery): ListPropertiesResponse {
  const open = allListings.filter((p) => !closedListingIds.has(p.id));
  const source =
    query.pinned === true ? pinnedListings : query.pinned === false ? open.filter((p) => !p.isPinned) : open;

  const stations = new Set(
    query.station
      ?.split(",")
      .map((code) => code.trim())
      .filter(Boolean),
  );

  const projectName = query.project ? (newProjects.find((p) => p.slug === query.project)?.name ?? "\0") : undefined;
  const agentName = query.agent ? (findAgentSeed(query.agent)?.name ?? "\0") : undefined;

  const filtered = source.filter((p) => {
    if (projectName !== undefined && p.projectName !== projectName) return false;
    if (agentName !== undefined && !(p.agent.kind === "agent" && p.agent.name === agentName)) return false;
    if (query.mode && p.mode !== query.mode) return false;
    if (query.type && p.type !== query.type) return false;
    if (stations.size > 0 && !(p.station && stations.has(p.station.code))) return false;
    if (query.minPrice !== undefined && p.price < query.minPrice) return false;
    if (query.maxPrice !== undefined && p.price > query.maxPrice) return false;
    if (query.minBedrooms && p.bedrooms < query.minBedrooms) return false;
    if (query.minArea !== undefined && p.area < query.minArea) return false;
    if (query.maxArea !== undefined && p.area > query.maxArea) return false;
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

const projectComparators: Record<ProjectSort, (a: ProjectDto, b: ProjectDto) => number> = {
  "-launchedAt": (a, b) => b.launchedAt.localeCompare(a.launchedAt),
  startingPrice: (a, b) => a.startingPrice - b.startingPrice,
  "-startingPrice": (a, b) => b.startingPrice - a.startingPrice,
  completionYear: (a, b) => a.completionYear - b.completionYear || a.launchedAt.localeCompare(b.launchedAt),
};

export function queryProjects(query: ListProjectsQuery): ListProjectsResponse {
  // Every filter except status, so the status tabs can show what each would return.
  const base = newProjects.filter((p) => {
    if (query.featured !== undefined && Boolean(p.isFeatured) !== query.featured) return false;
    if (query.type && p.type !== query.type) return false;
    if (query.line && p.station?.line !== query.line) return false;
    if (query.minPrice !== undefined && p.startingPrice < query.minPrice) return false;
    if (query.maxPrice !== undefined && p.startingPrice > query.maxPrice) return false;
    return true;
  });
  const counts = {
    all: base.length,
    "pre-sale": base.filter((p) => p.status === "pre-sale").length,
    "under-construction": base.filter((p) => p.status === "under-construction").length,
    ready: base.filter((p) => p.status === "ready").length,
  };
  const filtered = query.status ? base.filter((p) => p.status === query.status) : base;
  const sorted = [...filtered].sort(projectComparators[query.sort ?? "-launchedAt"]);

  const limit = query.limit ?? PROJECTS_DEFAULT_LIMIT;
  const page = query.page ?? 1;
  return {
    data: sorted.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total: sorted.length, totalPages: Math.max(1, Math.ceil(sorted.length / limit)) },
    counts,
  };
}

/** `GET /projects/:slug`. `undefined` = 404. */
export function getProjectDetail(slug: string): ProjectDetailDto | undefined {
  const project = newProjects.find((p) => p.slug === slug);
  if (!project) return undefined;
  const listingCount = allListings.filter((l) => l.projectName === project.name).length;
  return buildProjectDetail(project, listingCount);
}

const NEARBY_PROJECTS_RADIUS_M = 5_000;

/** `GET /projects/:slug/nearby`: other projects within 5 km, closest first. `undefined` = 404. */
export function queryNearbyProjects(slug: string, limit = 3): ListNearbyProjectsResponse | undefined {
  const origin = newProjects.find((p) => p.slug === slug);
  if (!origin) return undefined;
  const from = projectPoint(origin);
  const ranked = newProjects
    .filter((p) => p.id !== origin.id)
    .map((p) => ({ ...p, distance: distanceBetween(from, projectPoint(p)) }))
    .filter((p) => p.distance <= NEARBY_PROJECTS_RADIUS_M)
    .sort((a, b) => a.distance - b.distance);
  return { data: ranked.slice(0, limit) };
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
  if (!property) return undefined;
  const detail = buildPropertyDetail(property);
  // Agents with a profile page show their real live count, matching the profile.
  const profile = detail.poster.profileSlug ? findAgentSeed(detail.poster.profileSlug) : undefined;
  if (profile) detail.poster = { ...detail.poster, activeListings: agentListings(profile.name).length };
  return detail;
}

/** An agent's live listings (closed ones excluded). */
function agentListings(name: string): PropertyDto[] {
  return allListings.filter((p) => p.agent.kind === "agent" && p.agent.name === name && !closedListingIds.has(p.id));
}

const AGENT_AREAS_MAX = 6;

/** Public agent profile with counts and areas worked out from their live listings. */
export function getAgentProfile(slug: string): AgentProfileDto | undefined {
  const seed = findAgentSeed(slug);
  if (!seed) return undefined;
  const listings = agentListings(seed.name);
  const poster = findPoster({ name: seed.name, kind: "agent" }, 0);

  const areas = new Map<string, AgentAreaDto>();
  for (const p of listings) {
    if (!p.station) continue;
    const area = areas.get(p.station.code) ?? { station: p.station, listingCount: 0 };
    area.listingCount++;
    areas.set(p.station.code, area);
  }

  return {
    slug: seed.slug,
    name: seed.name,
    company: poster.company,
    teamSize: seed.teamSize,
    about: seed.about,
    yearsExperience: seed.yearsExperience,
    memberSince: poster.memberSince,
    responseMinutes: poster.responseMinutes,
    languages: poster.languages,
    phone: poster.phone,
    lineId: poster.lineId,
    phoneVerified: poster.phoneVerified,
    idVerified: poster.idVerified,
    workingHours: seed.workingHours,
    areas: [...areas.values()]
      .sort((a, b) => b.listingCount - a.listingCount || a.station.code.localeCompare(b.station.code))
      .slice(0, AGENT_AREAS_MAX),
    counts: {
      all: listings.length,
      buy: listings.filter((p) => p.mode === "buy").length,
      rent: listings.filter((p) => p.mode === "rent").length,
    },
  };
}

/** Slugs of every agent with a public profile (sitemap). */
export const agentSlugs = () => agentSeeds.map((a) => a.slug);

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
    .filter((p) => p.id !== origin.id && !closedListingIds.has(p.id))
    .map((p) => ({ ...p, distance: distanceBetween(from, listingPoint(p)) }))
    .filter((p) => p.distance <= NEARBY_RADIUS_M)
    .sort((a, b) => Number(b.mode === origin.mode) - Number(a.mode === origin.mode) || a.distance - b.distance);

  return { data: ranked.slice(0, limit) };
}

/** `GET /compare?ids=`: listing details in the order asked, unknown ids skipped. */
export function compareListings(ids: string[]): CompareListingsResponse {
  return {
    data: ids
      .map((id) => findListingById(id))
      .filter((p): p is PropertyDto => Boolean(p))
      .map((p) => ({ ...buildPropertyDetail(p), status: closedListingIds.has(p.id) ? "closed" : "active" })),
  };
}

/** `GET /places/projects?q=`: projects whose name matches, to fill in the address while posting. */
export function searchProjectPlaces(q: string): SearchProjectPlacesResponse {
  const term = q.trim().toLowerCase();
  if (!term) return { data: [] };
  return {
    data: newProjects
      .filter((p) => p.name.toLowerCase().includes(term))
      .slice(0, 5)
      .map((p) => {
        const detail = buildProjectDetail(p, 0);
        const [district, province = "กรุงเทพฯ"] = p.district.split(",").map((x) => x.trim());
        return {
          name: p.name,
          subdistrict: "",
          district,
          province: province === "กรุงเทพฯ" ? "กรุงเทพมหานคร" : province,
          road: undefined,
          point: projectPoint(p),
          totalFloors: p.type === "condo" ? detail.floors : undefined,
          listingCount: allListings.filter((l) => l.projectName === p.name).length,
        };
      }),
  };
}

/** `GET /stations/nearby`: stations within 1.5 km walking of a point. */
export function queryNearbyStations(point: { lat: number; lng: number }): NearbyStationsResponse {
  return { data: stationsNear(point).filter((s) => s.distance <= 1500) };
}

/** Live listings posted under a name (owner or agent), newest first; used to seed mock chats. */
export function listingsByPoster(name: string): PropertyDto[] {
  return allListings
    .filter((p) => p.agent.name === name && !closedListingIds.has(p.id))
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

/**
 * Listings the demo lister "owns" in the seller dashboard, in a fixed order so
 * every account gets the same workspace. Stand-in until the API links listings
 * to accounts.
 */
export function sellerSourceListings(count: number): PropertyDto[] {
  return allListings
    .filter((p) => !p.isPinned && !closedListingIds.has(p.id) && p.type !== "land")
    .sort((a, b) => hash(a.id) - hash(b.id))
    .slice(0, count);
}

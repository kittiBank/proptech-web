/**
 * Domain types shared by UI and the data layer.
 * Shapes mirror the planned NestJS API DTOs so the mock layer can be swapped
 * for real fetches without touching components.
 */

export type ListingMode = "buy" | "rent";

export type PropertyType = "condo" | "house" | "townhouse" | "land" | "commercial";

export interface PropertyImage {
  src: string;
  alt: string;
}

export interface TransitStation {
  line: TransitLineId;
  code: string;
  name: string;
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  projectName?: string;
  mode: ListingMode;
  type: PropertyType;
  /** THB. For rentals this is the monthly rent. */
  price: number;
  /** Usable area in square metres. */
  area: number;
  /** Land size in square wah, for houses, townhouses and land. */
  landSize?: number;
  bedrooms: number;
  bathrooms: number;
  floor?: number;
  district: string;
  locationId: string;
  station?: TransitStation;
  /** Walking distance to the station in metres. */
  stationDistance?: number;
  /** Cover photo, used wherever a single image is shown. */
  image: PropertyImage;
  /** Photos for the card slideshow, cover first. Falls back to `image` when absent. */
  gallery?: PropertyImage[];
  postedAt: string;
  /** Times the listing page has been opened. */
  viewCount?: number;
  isVerified: boolean;
  agent: {
    name: string;
    kind: "owner" | "agent";
  };
  highlight?: string;
  /** Paid placement shown in the pinned highlight section. */
  isPinned?: boolean;
}

export type TransitLineId = "bts-sukhumvit" | "bts-silom" | "mrt-blue";

export interface TransitLine {
  id: TransitLineId;
  name: string;
  shortName: string;
  stations: LocationArea[];
}

export interface LocationArea {
  id: string;
  name: string;
  nameEn: string;
  stationCode: string;
  image: PropertyImage;
  listingCount: number;
  /** Median asking price for condos, THB per square metre. */
  medianPricePerSqm: number;
  description: string;
}

export type ProjectStatus = "ready" | "under-construction" | "pre-sale";

export interface NewProject {
  id: string;
  slug: string;
  name: string;
  developer: string;
  type: Extract<PropertyType, "condo" | "house" | "townhouse">;
  district: string;
  startingPrice: number;
  status: ProjectStatus;
  /** Construction progress 0–100, when under construction. */
  progress?: number;
  completionYear: number;
  units: number;
  image: PropertyImage;
  summary: string;
}

export interface PropertyCategory {
  type: PropertyType;
  label: string;
  description: string;
  listingCount: number;
}

export interface SearchFilters {
  mode: ListingMode;
  keyword: string;
  type: PropertyType | "all";
  /** Station code (e.g. "E6") or "any". */
  station: string;
  priceRange: string;
}

/** Sponsored banner shown between listings. */
export interface Advertisement {
  id: string;
  /** Advertiser shown on the "sponsored" label. */
  sponsor: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  image: PropertyImage;
}

export interface PriceRangeOption {
  value: string;
  label: string;
  min?: number;
  max?: number;
}

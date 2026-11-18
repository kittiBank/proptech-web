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
  /** Map position. Sent on list responses so results can be plotted. */
  point?: GeoPoint;
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
  /** Station location, for maps and distance calculations. */
  point?: GeoPoint;
}

export type ProjectStatus = "ready" | "under-construction" | "pre-sale";

export type ProjectType = Extract<PropertyType, "condo" | "house" | "townhouse">;

export interface NewProject {
  id: string;
  slug: string;
  name: string;
  developer: string;
  type: ProjectType;
  district: string;
  startingPrice: number;
  status: ProjectStatus;
  /** Construction progress 0–100, when under construction. */
  progress?: number;
  completionYear: number;
  units: number;
  image: PropertyImage;
  summary: string;
  /** Closest station and the walking distance to it in metres. */
  station?: TransitStation;
  stationDistance?: number;
  /** Unit size range: square metres for condos, square wah of land for houses. */
  sizeRange: { min: number; max: number; unit: "sqm" | "sqwah" };
  /** Units still for sale. */
  unitsLeft: number;
  /** ISO date the project opened for sale. */
  launchedAt: string;
  /** Promoted at the top of the projects page. */
  isFeatured?: boolean;
}

/** One floor plan with its price. */
export interface ProjectUnitType {
  id: string;
  name: string;
  bedrooms: number;
  /** Usable area in square metres. */
  area: number;
  /** Starting price in THB. */
  price: number;
  unitsLeft: number;
}

export interface ProjectMilestone {
  title: string;
  detail: string;
  /** Display date, e.g. "มี.ค. 2568" or "ไตรมาส 2 2570". */
  date: string;
  state: "done" | "current" | "upcoming";
}

/** Everything the project page shows. `GET /projects/:slug` */
export interface ProjectDetail extends NewProject {
  gallery: PropertyImage[];
  description: string;
  address: string;
  developerProjects: number;
  buildings: number;
  floors: number;
  /** Project land in square wah. */
  landSize: number;
  /** Parking spaces as a share of units, 0–100. */
  parkingRatio: number;
  /** Booking deposit in THB. */
  reservationFee: number;
  promotion?: { title: string; detail: string };
  unitTypes: ProjectUnitType[];
  milestones: ProjectMilestone[];
  /** ISO date the developer last updated construction progress. */
  progressUpdatedAt: string;
  facilities: string[];
  salesPhone: string;
  location: {
    address: string;
    point: GeoPoint;
    stations: NearbyStation[];
    places: NearbyPlace[];
  };
  /** Resale and rental listings posted inside this project. */
  listingCount: number;
}

/** A project near another one, with the straight-line distance between them. */
export type NearbyProject = NewProject & { distance: number };

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

// ---------------------------------------------------------------------------
// Listing page
// ---------------------------------------------------------------------------

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type Furnishing = "fully" | "partly" | "unfurnished";

export interface NearbyStation {
  station: TransitStation;
  /** Walking distance in metres. */
  distance: number;
}

export type PlaceCategory = "shopping" | "hospital" | "education" | "park" | "office";

export interface NearbyPlace {
  name: string;
  category: PlaceCategory;
  /** Distance in metres. */
  distance: number;
}

/** The owner or agent who posted a listing. */
export interface Poster {
  id: string;
  name: string;
  kind: "owner" | "agent";
  /** Agency or company, for agents. */
  company?: string;
  phone: string;
  lineId?: string;
  /** ISO date the account was created. */
  memberSince: string;
  activeListings: number;
  /** Typical reply time in minutes. */
  responseMinutes: number;
  phoneVerified: boolean;
  idVerified: boolean;
  languages: string[];
}

/** Everything the listing page shows. `GET /properties/:slug` */
export interface PropertyDetail extends Property {
  /** Human-facing listing reference, e.g. "PH-1001". */
  code: string;
  description: string;
  updatedAt: string;
  totalFloors?: number;
  parking: number;
  furnishing?: Furnishing;
  /** Direction the main windows or the front of the house face. */
  facing?: string;
  yearBuilt?: number;
  /** Monthly common-area fee in THB. */
  commonFee?: number;
  /** Rentals: deposit and advance, in months of rent. */
  depositMonths?: number;
  advanceMonths?: number;
  /** Rentals: minimum contract length in months. */
  minContractMonths?: number;
  /** Amenity ids inside the unit (see `data/amenities.ts`). */
  features: string[];
  /** Amenity ids shared by the project or building. */
  facilities: string[];
  /** Short selling points the poster picked, e.g. "เลี้ยงสัตว์ได้". */
  highlights: string[];
  location: {
    address: string;
    point: GeoPoint;
    stations: NearbyStation[];
    places: NearbyPlace[];
  };
  poster: Poster;
}

/** A listing near another one, with the straight-line distance between them. */
export type NearbyProperty = Property & { distance: number };

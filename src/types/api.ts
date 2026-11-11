/**
 * Request/response contract with the NestJS API.
 *
 * The MSW handlers (`src/mocks`) implement exactly this contract, so pointing
 * NEXT_PUBLIC_API_URL at the real backend needs no UI or data-layer changes.
 * Keep this file free of runtime imports: it is shared by the client, the
 * mocks and (later) the backend's DTO definitions.
 */
import type {
  Advertisement,
  ListingMode,
  NewProject,
  Property,
  PropertyCategory,
  PropertyType,
  TransitLine,
} from "./property";

// ---------------------------------------------------------------------------
// Envelopes
// ---------------------------------------------------------------------------

/** Non-paginated collection. */
export interface ListResponse<T> {
  data: T[];
}

export interface PageMeta {
  /** 1-based page number. */
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PageMeta;
}

/** NestJS default error body (`HttpException` → JSON). */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export type PropertyDto = Property;
export type ProjectDto = NewProject;
export type CategoryDto = PropertyCategory;
/** A transit line with its stations, as returned by `GET /stations`. */
export type TransitLineDto = TransitLine;
export type AdDto = Advertisement;

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export type PropertySort = "-postedAt" | "postedAt" | "-price" | "price";

/** `GET /properties` query string. Every field is optional. */
export interface ListPropertiesQuery {
  /** `true` = paid pinned placements only, `false` = exclude them. */
  pinned?: boolean;
  mode?: ListingMode;
  type?: PropertyType;
  /** Free-text search over title, project, district and station. */
  q?: string;
  /** Station code, e.g. "E4". */
  station?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: PropertySort;
  /** 1-based. Default 1. */
  page?: number;
  /** Default 20, max 100. */
  limit?: number;
}

/** `GET /properties` */
export type ListPropertiesResponse = PaginatedResponse<PropertyDto>;

/** `GET /projects` query string. */
export interface ListProjectsQuery {
  status?: "new";
}

/** `GET /projects` */
export type ListProjectsResponse = ListResponse<ProjectDto>;

/** `GET /stations` */
export type ListStationsResponse = ListResponse<TransitLineDto>;

/** `GET /categories` */
export type ListCategoriesResponse = ListResponse<CategoryDto>;

export type AdPlacement = "home-feed";

/** `GET /ads` query string. */
export interface ListAdsQuery {
  placement: AdPlacement;
}

/** `GET /ads` */
export type ListAdsResponse = ListResponse<AdDto>;

export const PROPERTIES_DEFAULT_LIMIT = 20;
export const PROPERTIES_MAX_LIMIT = 100;

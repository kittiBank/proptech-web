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
  NearbyProject,
  NearbyProperty,
  PropertyDetail,
  ListingMode,
  NewProject,
  ProjectDetail,
  ProjectStatus,
  ProjectType,
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
export type PropertyDetailDto = PropertyDetail;
export type NearbyPropertyDto = NearbyProperty;
export type ProjectDto = NewProject;
export type ProjectDetailDto = ProjectDetail;
export type NearbyProjectDto = NearbyProject;
export type CategoryDto = PropertyCategory;
/** A transit line with its stations, as returned by `GET /stations`. */
export type TransitLineDto = TransitLine;
export type AdDto = Advertisement;

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/** `stationDistance` = closest walk to a station first; listings with no station come last. */
export type PropertySort = "-postedAt" | "postedAt" | "-price" | "price" | "stationDistance";

/** `GET /properties` query string. Every field is optional. */
export interface ListPropertiesQuery {
  /** `true` = paid pinned placements only, `false` = exclude them. */
  pinned?: boolean;
  mode?: ListingMode;
  type?: PropertyType;
  /** Free-text search over title, project, district and station. */
  q?: string;
  /** Station codes, comma-separated: "E4" or "E4,N5" matches listings near any of them. */
  station?: string;
  minPrice?: number;
  maxPrice?: number;
  /** At least this many bedrooms. 0 = any, including studios. */
  minBedrooms?: number;
  /** Usable area bounds in square metres. */
  minArea?: number;
  maxArea?: number;
  /** Project slug: only listings posted inside that project. */
  project?: string;
  sort?: PropertySort;
  /** 1-based. Default 1. */
  page?: number;
  /** Default 20, max 100. */
  limit?: number;
}

/** `GET /properties` */
export type ListPropertiesResponse = PaginatedResponse<PropertyDto>;

/** `-launchedAt` = newest launch first; `completionYear` = finishing soonest first. */
export type ProjectSort = "-launchedAt" | "startingPrice" | "-startingPrice" | "completionYear";

/** `GET /projects` query string. Every field is optional. */
export interface ListProjectsQuery {
  status?: ProjectStatus;
  type?: ProjectType;
  /** Transit line id: projects whose closest station is on that line. */
  line?: TransitLine["id"];
  /** Bounds on the starting price, THB. */
  minPrice?: number;
  maxPrice?: number;
  /** `true` = only the promoted project(s). */
  featured?: boolean;
  sort?: ProjectSort;
  /** 1-based. Default 1. */
  page?: number;
  /** Default 9, max 50. */
  limit?: number;
}

/**
 * `GET /projects`. `counts` holds the number of projects per status for the
 * other active filters (status itself ignored), for the status tabs.
 */
export type ListProjectsResponse = PaginatedResponse<ProjectDto> & {
  counts: Record<ProjectStatus | "all", number>;
};

/** `GET /projects/:slug` — 404 when the project does not exist. */
export interface GetProjectResponse {
  data: ProjectDetailDto;
}

/** `GET /projects/:slug/nearby` — closest other projects first, within 5 km. */
export type ListNearbyProjectsResponse = ListResponse<NearbyProjectDto>;

/** `POST /projects/:slug/viewings` body: ask the developer's sales team for a show-unit visit. */
export interface CreateProjectViewingRequest {
  name: string;
  phone: string;
  /** ISO date, today or later. */
  date: string;
  /** `ProjectUnitType.id`, when the visitor picked one. */
  unitTypeId?: string;
}

/** `POST /projects/:slug/viewings` — 201. */
export interface CreateProjectViewingResponse {
  data: { id: string; createdAt: string };
}

export const PROJECTS_DEFAULT_LIMIT = 9;
export const PROJECTS_MAX_LIMIT = 50;

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

/** `GET /properties/:slug` — 404 when the listing does not exist or was taken down. */
export interface GetPropertyResponse {
  data: PropertyDetailDto;
}

/** `GET /properties/:slug/nearby` query string. */
export interface ListNearbyPropertiesQuery {
  /** Default 6, max 24. */
  limit?: number;
}

/** `GET /properties/:slug/nearby` — closest listings first, same deal type preferred. */
export type ListNearbyPropertiesResponse = ListResponse<NearbyPropertyDto>;

/** `POST /properties/:slug/enquiries` body. */
export interface CreateEnquiryRequest {
  name: string;
  phone: string;
  message: string;
}

/** `POST /properties/:slug/enquiries` — 201. */
export interface CreateEnquiryResponse {
  data: { id: string; createdAt: string };
}

export const NEARBY_MAX_LIMIT = 24;

export const PROPERTIES_DEFAULT_LIMIT = 20;
export const PROPERTIES_MAX_LIMIT = 100;

// ---------------------------------------------------------------------------
// Favorites and compare (signed-in user; the mock keeps one user's list)
// ---------------------------------------------------------------------------

export type FavoriteStatus = "active" | "closed";

/** A saved listing. `savedPrice` above `property.price` means the price dropped since saving. */
export interface FavoriteDto {
  property: PropertyDto;
  /** ISO date-time the listing was saved. */
  savedAt: string;
  /** Asking price when the listing was saved, THB. */
  savedPrice: number;
  /** Private note, empty when none. */
  note: string;
  /** `closed` = the listing was taken down, sold or rented; the snapshot stays for reference. */
  status: FavoriteStatus;
}

/** `GET /me/favorites` — newest saved first. */
export type ListFavoritesResponse = ListResponse<FavoriteDto>;

/** `PUT /me/favorites/:propertyId` — idempotent save; 201 when new, 200 when already saved. */
export interface SaveFavoriteResponse {
  data: FavoriteDto;
}

/** `PATCH /me/favorites/:propertyId` body. */
export interface UpdateFavoriteRequest {
  /** Max 200 characters; empty string clears it. */
  note: string;
}

/** `DELETE /me/favorites/:propertyId` — 204, also when it was not saved. */

/** `GET /compare?ids=` — up to `COMPARE_MAX` listing ids, comma-separated. Unknown ids are skipped. */
export type CompareListingsResponse = ListResponse<PropertyDetailDto & { status: FavoriteStatus }>;

export const COMPARE_MAX = 3;
export const FAVORITE_NOTE_MAX = 200;

// ---------------------------------------------------------------------------
// Auth (cookie session; the mock keeps it in browser storage)
// ---------------------------------------------------------------------------

export type UserRole = "seeker" | "owner" | "agent";

export interface UserPreferences {
  intent: "buy" | "rent" | "both";
  types: Array<"condo" | "house" | "townhouse">;
  lines: TransitLine["id"][];
  /** A budget bracket id, e.g. "3-5m". */
  budget?: string;
  alerts: { email: boolean; line: boolean };
}

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  /** Finished or skipped the onboarding questions. */
  onboarded: boolean;
  role?: UserRole;
  preferences?: UserPreferences;
}

export interface SessionResponse {
  data: UserDto;
}

/** `POST /auth/login` — 401 on a wrong email or password. */
export interface LoginRequest {
  email: string;
  password: string;
  /** Keep the session after the browser closes. */
  remember: boolean;
}

/** `POST /auth/register` — 201 and signed in; 409 when the email is taken. */
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  acceptTerms: true;
  marketing: boolean;
}

export type OAuthProvider = "google" | "line";

/** `POST /auth/verify-email` — 400 when the token is invalid or expired. */
export interface VerifyEmailRequest {
  token: string;
}

/** `POST /auth/forgot-password` — always 202, so the response never reveals whether an account exists. */
export interface ForgotPasswordRequest {
  email: string;
}

/** `POST /auth/reset-password` — 400 when the token is invalid or expired. */
export interface ResetPasswordRequest {
  token: string;
  password: string;
}

/** `PATCH /me/onboarding` */
export interface OnboardingRequest {
  role?: UserRole;
  preferences?: UserPreferences;
}

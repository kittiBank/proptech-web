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
  NearbyStation,
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
  TransitStation,
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
  /** Agent profile slug: only that agent's listings. */
  agent?: string;
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
// Agents (public profiles)
// ---------------------------------------------------------------------------

/** A station an agent has live listings near, for "ย่านที่ดูแล". */
export interface AgentAreaDto {
  station: TransitStation;
  /** Live listings near this station. */
  listingCount: number;
}

/** `GET /agents/:slug` — public agent profile (A7, A9). 404 for unknown slugs. */
export interface AgentProfileDto {
  slug: string;
  name: string;
  company?: string;
  teamSize?: number;
  about: string;
  yearsExperience: number;
  /** ISO date the account was created. */
  memberSince: string;
  /** Typical reply time in minutes. */
  responseMinutes: number;
  languages: string[];
  phone: string;
  lineId?: string;
  phoneVerified: boolean;
  idVerified: boolean;
  /** e.g. "จันทร์–เสาร์ 9:00–19:00". */
  workingHours: string;
  /** Busiest stations first, at most 6. */
  areas: AgentAreaDto[];
  /** Live listings, for the listing tabs. */
  counts: { all: number; buy: number; rent: number };
}

export interface GetAgentResponse {
  data: AgentProfileDto;
}

// ---------------------------------------------------------------------------
// Saved searches and unread counts (signed-in user)
// ---------------------------------------------------------------------------

export type AlertFrequency = "instant" | "daily" | "weekly";

/** A search the user saved for alerts (B9, D11). */
export interface SavedSearchDto {
  id: string;
  /** e.g. "คอนโดขาย ใกล้ BTS ทองหล่อ". */
  name: string;
  /** The `/search` query string it reruns, e.g. "mode=buy&type=condo&station=E6". */
  query: string;
  alerts: { email: boolean; line: boolean; frequency: AlertFrequency };
  /** Listings posted since the user last opened it. */
  newCount: number;
  /** ISO date. */
  createdAt: string;
}

/** Most saved searches one account can keep. */
export const MAX_SAVED_SEARCHES = 10;

/** `POST /me/saved-searches` body. Saving the same `query` again returns the existing search (200). 409 at the limit. */
export interface CreateSavedSearchRequest {
  name: string;
  query: string;
}

/** `POST /me/saved-searches` (201 new, 200 already saved). */
export interface SavedSearchResponse {
  data: SavedSearchDto;
}

/** `GET /me/saved-searches`, newest first. */
export type ListSavedSearchesResponse = ListResponse<SavedSearchDto>;

/** `GET /me/unread-counts` — badges for the bottom nav and the notifications bell. */
export interface UnreadCountsResponse {
  data: { messages: number; notifications: number };
}

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

/**
 * `GET /auth/me` — 200 with `data: null` when signed out. Not a 401: every page
 * checks the session, and a 401 would log a console error on each visit.
 */
export interface GetSessionResponse {
  data: UserDto | null;
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

// ---------------------------------------------------------------------------
// Post a listing: drafts, photos, promotions, publishing
// ---------------------------------------------------------------------------

export type PostStep = "type" | "location" | "details" | "photos" | "publish";
export type PosterKind = "owner" | "agent" | "developer";
export type DealType = "sale" | "rent" | "both";
export type PromotionId = "none" | "auto_bump" | "featured" | "homepage_pin";

export interface DraftPhoto {
  id: string;
  /** Hosted image URL (the mock keeps a small preview). */
  url: string;
  name: string;
  status: "ready" | "rejected";
  /** Why a photo was rejected, shown on the tile. */
  reason?: string;
  isFloorPlan?: boolean;
}

/** Everything the wizard collects. Every field is optional until its step is validated. */
export interface DraftValues {
  posterKind: PosterKind;
  deal: DealType;
  propertyType?: PropertyType;

  projectName?: string;
  houseNo?: string;
  soi?: string;
  road?: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  point?: { lat: number; lng: number };
  exactLocation: boolean;
  /** Station codes to show on the listing, max 3. */
  stations: string[];

  bedrooms?: number;
  bathrooms?: number;
  /** Usable area in m²; land size in ตร.ว. for land. */
  area?: number;
  floor?: number;
  totalFloors?: number;
  facing?: string;
  /** Buddhist-era year, as entered (e.g. 2563). */
  yearBuilt?: number;
  parking?: number;
  furnishing?: "fully" | "partly" | "unfurnished";
  features: string[];
  petFriendly: boolean;
  title?: string;
  description?: string;

  /** Cover first. */
  photos: DraftPhoto[];
  videoUrl?: string;

  price?: number;
  rentPrice?: number;
  commonFee?: number;
  negotiable: boolean;
  transferFee: "split" | "buyer" | "seller";
  promotion: PromotionId;
  confirmed: boolean;
}

export interface DraftDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** Steps whose data passed validation, in order. */
  completedSteps: PostStep[];
  values: DraftValues;
}

/** `GET /me/drafts` — unfinished drafts, newest first. */
export type ListDraftsResponse = ListResponse<DraftDto>;

export interface DraftResponse {
  data: DraftDto;
}

/** `PATCH /me/drafts/:id` — merges `values`; `completedSteps` replaces the list when given. */
export interface UpdateDraftRequest {
  values?: Partial<DraftValues>;
  completedSteps?: PostStep[];
}

/** `POST /me/drafts/:id/photos` — the photo's metadata; the mock checks it like the media service would. */
export interface UploadPhotoRequest {
  name: string;
  /** Bytes. */
  size: number;
  mimeType: string;
  width: number;
  height: number;
  /** Small data-URL preview the mock keeps as the hosted image. */
  preview: string;
}

export interface UploadPhotoResponse {
  data: DraftPhoto;
}

export interface PromotionOption {
  id: PromotionId;
  title: string;
  description: string;
  /** THB, VAT included. 0 = free. */
  price: number;
  days?: number;
  badge?: string;
  /** Slots left today, for capped placements. */
  slotsLeft?: number;
}

/** `GET /promotions` */
export type ListPromotionsResponse = ListResponse<PromotionOption>;

/** `GET /me/listing-quota` — free listings for owners. */
export interface ListingQuotaResponse {
  data: { used: number; limit: number };
}

/** `GET /places/projects?q=` — projects to fill the address from. */
export interface ProjectPlace {
  name: string;
  subdistrict: string;
  district: string;
  province: string;
  road?: string;
  point: { lat: number; lng: number };
  totalFloors?: number;
  listingCount: number;
}

export type SearchProjectPlacesResponse = ListResponse<ProjectPlace>;

/** `GET /stations/nearby?lat=&lng=` — stations within 1.5 km walking, nearest first. */
export type NearbyStationsResponse = ListResponse<NearbyStation>;

/**
 * `POST /me/drafts/:id/publish` — 422 with the failing steps when data is
 * missing, 403 `kyc_required` for unverified agents, 409 when the free quota
 * is used up. A paid promotion returns an order to pay; it starts after review.
 */
/** A listing sent for review. `GET /me/drafts/:id/submission` returns it once the draft is published. */
export interface SubmittedListingDto {
  id: string;
  code: string;
  slug: string;
  status: "pending_review";
  draftId: string;
  submittedAt: string;
  /** What was submitted, for the success page preview. */
  values: DraftValues;
}

export interface SubmissionResponse {
  data: SubmittedListingDto;
}

export interface PublishDraftResponse {
  data: {
    listing: { id: string; code: string; slug: string; status: "pending_review"; submittedAt: string };
    order?: { id: string; amount: number; promotion: PromotionId };
  };
}

// ---------------------------------------------------------------------------
// Guides (articles)
// ---------------------------------------------------------------------------

export type ArticleCategory = "buying" | "renting" | "selling" | "finance" | "location" | "new-projects";

/** One piece of article body. The CMS stores bodies as blocks so the page can render rich parts (D2). */
export type ArticleBlock =
  | { type: "paragraph"; text: string }
  /** Section heading; `id` is the anchor the table of contents links to. */
  | { type: "heading"; id: string; text: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; tone: "warning" | "tip"; title: string; text: string }
  /** Inline mortgage estimate, prefilled with these values. */
  | { type: "calculator"; price: number; downPaymentPct: number; annualRatePct: number; years: number };

/** Listings shown beside an article: a ready-made `GET /properties` filter and its heading. */
export interface ArticleRelatedListings {
  title: string;
  query: Pick<ListPropertiesQuery, "mode" | "type" | "station" | "minPrice" | "maxPrice">;
}

/** Card fields, as returned by `GET /articles`. */
export interface ArticleSummaryDto {
  slug: string;
  title: string;
  excerpt: string;
  category: ArticleCategory;
  cover: { src: string; alt: string };
  author: string;
  readingMinutes: number;
  /** ISO date. */
  publishedAt: string;
  featured: boolean;
}

export interface ArticleDetailDto extends ArticleSummaryDto {
  /** Shown under the author, e.g. "ตรวจทานโดยทนายความ". */
  reviewedBy?: string;
  /** ISO date. */
  updatedAt: string;
  coverCaption?: string;
  body: ArticleBlock[];
  related?: ArticleRelatedListings;
}

/** `GET /articles` query string. */
export interface ListArticlesQuery {
  category?: ArticleCategory;
  /** Free-text search over title and excerpt. */
  q?: string;
  featured?: boolean;
  /** 1-based. Default 1. */
  page?: number;
  /** Default 9, max 30. */
  limit?: number;
}

/** `GET /articles`, newest first. */
export type ListArticlesResponse = PaginatedResponse<ArticleSummaryDto>;

/** `GET /articles/:slug` — 404 when the article does not exist. */
export interface GetArticleResponse {
  data: ArticleDetailDto;
}

export const ARTICLES_DEFAULT_LIMIT = 9;
export const ARTICLES_MAX_LIMIT = 30;

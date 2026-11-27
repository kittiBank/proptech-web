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
// Account: profile, security, notification settings, privacy (B7, B20)
// ---------------------------------------------------------------------------

export type NotificationTopic = "saved_search" | "price_drop" | "message" | "listing_closed" | "new_project";
export type NotificationChannel = "email" | "line" | "web";
export type NotificationMatrix = Record<NotificationTopic, Record<NotificationChannel, boolean>>;

export interface SignedInDevice {
  id: string;
  /** e.g. "MacBook Air, Chrome". */
  name: string;
  current: boolean;
  /** ISO date. */
  lastActiveAt: string;
}

/** `GET /me/profile` — everything B7 shows. Names and email mirror the session user. */
export interface ProfileDto {
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  /** Thai mobile, "0812345678". */
  phone?: string;
  phoneVerified: boolean;
  lineId?: string;
  language: "th" | "en";
  /** Data URL or CDN URL. */
  avatarUrl?: string;
  linked: { google?: string; line: boolean };
  /** ISO date; undefined for SSO-only accounts. */
  passwordChangedAt?: string;
  devices: SignedInDevice[];
  notifications: NotificationMatrix;
  marketingOptIn: boolean;
}

export interface ProfileResponse {
  data: ProfileDto;
}

/** `PATCH /me/profile` — personal info, avatar and settings. Changing `phone` clears `phoneVerified`. */
export type UpdateProfileRequest = Partial<
  Pick<ProfileDto, "firstName" | "lastName" | "phone" | "lineId" | "language" | "notifications" | "marketingOptIn">
> & {
  /** `null` removes the photo. */
  avatarUrl?: string | null;
};

/** `POST /me/phone/otp` (202) then `POST /me/phone/verify`. The mock code is `MOCK_OTP_CODE`. */
export interface VerifyPhoneRequest {
  code: string;
}

/** `POST /me/password` — 204; 400 when `currentPassword` is wrong. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ---------------------------------------------------------------------------
// Notifications (B19)
// ---------------------------------------------------------------------------

export type NotificationKind = "price_drop" | "viewing" | "new_match" | "listing_closed" | "new_project";

export interface NotificationDto {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  /** Where tapping it goes. */
  href: string;
  /** ISO date. */
  createdAt: string;
  read: boolean;
}

/** `GET /me/notifications?kind=` — newest first. */
export type ListNotificationsResponse = ListResponse<NotificationDto>;

// ---------------------------------------------------------------------------
// Messages and viewing requests (B14–B18)
// ---------------------------------------------------------------------------

export type ViewingStatusDto =
  "requested" | "confirmed" | "counter_proposed" | "declined" | "expired" | "cancelled" | "completed";

/** A request expires when the lister has not answered within this many hours. */
export const VIEWING_EXPIRY_HOURS = 24;

/** The listing a thread is about (property or developer project). */
export interface ThreadListingDto {
  kind: "property" | "project";
  id: string;
  title: string;
  /** Page to open it. */
  href: string;
  price?: number;
  mode?: ListingMode;
  /** "฿9.2 ล้าน", "เริ่ม ฿4.59 ล้าน". */
  priceLabel: string;
  image: { src: string; alt: string };
  station?: TransitStation;
  stationDistance?: number;
  /** Lister's viewing hours, e.g. "09:00–19:00". */
  viewingHours: string;
}

export interface ThreadCounterpartDto {
  name: string;
  /** `buyer` = the person asking about one of my listings (lister threads); `support` = PropertyHub's team. */
  kind: "agent" | "owner" | "developer" | "buyer" | "support";
  /** Public agent profile, when there is one. */
  profileSlug?: string;
  phone: string;
  idVerified: boolean;
  /** Buyers: verified their phone number (C10 "ยืนยันเบอร์แล้ว"). */
  phoneVerified?: boolean;
  responseMinutes: number;
}

export interface ViewingRequestDto {
  id: string;
  threadId: string;
  /** ISO start of the requested slot (Bangkok time). */
  slot: string;
  backupSlot?: string;
  /** Set when the lister proposes another time. */
  proposedSlot?: string;
  partySize: number;
  note?: string;
  status: ViewingStatusDto;
  createdAt: string;
  /** When a `requested` request lapses. */
  expiresAt: string;
  respondedAt?: string;
}

export interface MessageDto {
  id: string;
  threadId: string;
  from: "me" | "them";
  /** `viewing` messages render the request card for `viewingId`. */
  kind: "text" | "viewing";
  text: string;
  viewingId?: string;
  createdAt: string;
  /** When the other side read it (my messages only). */
  readAt?: string;
}

export interface ThreadDto {
  id: string;
  /** Buyers may request viewings; listers answer them (seller dashboard). */
  role: "buyer" | "lister";
  counterpart: ThreadCounterpartDto;
  listing?: ThreadListingDto;
  lastMessage: Pick<MessageDto, "text" | "from" | "createdAt">;
  unreadCount: number;
  /** The most recent viewing request, if any. */
  viewing?: ViewingRequestDto;
}

/** `GET /me/threads?filter=` — newest activity first. */
export type ListThreadsResponse = ListResponse<ThreadDto>;
export type ThreadFilter = "all" | "unread" | "viewing";

/** `GET /me/threads/:id` — 404 for someone else's thread. */
export interface ThreadDetailResponse {
  data: { thread: ThreadDto; messages: MessageDto[]; viewings: ViewingRequestDto[] };
}

/** `POST /me/threads` — opens the existing thread with that recipient or starts one. `to`: "agent:<slug>", "property:<slug>", "project:<slug>" or "support". */
export interface StartThreadRequest {
  to: string;
}

/** `POST /me/threads/:id/messages` */
export interface SendMessageRequest {
  text: string;
}

/** One bookable hour on a day (B18). */
export interface ViewingSlotDto {
  /** "10:00" */
  time: string;
  available: boolean;
}

/** `GET /me/threads/:id/slots` — the next days the lister takes viewings. */
export interface ViewingSlotsResponse {
  data: { days: { date: string; slots: ViewingSlotDto[] }[]; viewingHours: string };
}

/** `POST /me/threads/:id/viewings` — buyers only (403 for listers); 409 while another request is open. */
export interface CreateViewingRequest {
  slot: string;
  backupSlot?: string;
  partySize: number;
  note?: string;
}

/**
 * `PATCH /me/viewings/:id`. Buyer: `cancel`, or `accept` a counter-proposal.
 * Lister: `confirm` (optionally with `slot` = the backup slot to confirm that one),
 * `decline`, or `propose` with `slot`.
 */
export interface UpdateViewingRequest {
  action: "cancel" | "accept" | "confirm" | "decline" | "propose";
  slot?: string;
}

/** A viewing with what the appointments page needs to show it. */
export interface AppointmentDto extends ViewingRequestDto {
  listing?: ThreadListingDto;
  counterpart: ThreadCounterpartDto;
  role: ThreadDto["role"];
}

/** `GET /me/viewings` — every viewing request in the user's threads, soonest first. */
export type ListAppointmentsResponse = ListResponse<AppointmentDto>;

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

/** `PATCH /me/saved-searches/:id` — rename or change alerts. `DELETE` removes it (204). */
export interface UpdateSavedSearchRequest {
  name?: string;
  alerts?: Partial<SavedSearchDto["alerts"]>;
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
  | { type: "calculator"; price: number; downPaymentPct: number; annualRatePct: number; years: number }
  /** Smaller heading inside a section (H3); not in the table of contents. */
  | { type: "subheading"; text: string }
  | { type: "image"; src: string; alt: string; caption?: string }
  /** Live listing cards from a `GET /properties` filter (E9 "การ์ดประกาศ"). */
  | { type: "listings"; title: string; query: ArticleRelatedListings["query"]; limit: number };

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

// ---------------------------------------------------------------------------
// Seller dashboard (C8–C11, C14)
// ---------------------------------------------------------------------------

export type SellerPlan = "free" | "agent_pro" | "agency";
export type SellerKycStatus = "not_started" | "in_progress" | "submitted" | "needs_info" | "approved" | "rejected";

export interface QuotaUsage {
  used: number;
  limit: number;
}

/** `GET /me/seller` — the lister's package, credit and badges for the SellerShell. */
export interface SellerAccountDto {
  plan: SellerPlan;
  /** "นายหน้า Pro". */
  planName: string;
  kycStatus: SellerKycStatus;
  /** ISO date the package renews (auto-renew) or ends. */
  renewsAt: string;
  autoRenew: boolean;
  /** Prepaid credit, THB. */
  credit: number;
  usage: { listings: QuotaUsage; bumps: QuotaUsage; featured: QuotaUsage };
  /** Viewing requests waiting for my answer. */
  pendingViewings: number;
}

export interface SellerAccountResponse {
  data: SellerAccountDto;
}

/** Listing statuses a lister sees (design handoff §4). Sold and rented listings show as `closed`. */
export type SellerListingStatus = "draft" | "pending_review" | "published" | "rejected" | "expired" | "closed";

/** A promotion currently running on a listing. */
export interface ActivePromotionDto {
  kind: Exclude<PromotionId, "none">;
  /** ISO date it ends. */
  endsAt: string;
}

/** One row of "ประกาศของฉัน" (C9, C11). Drafts and listings under review have no stats yet. */
export interface SellerListingDto {
  id: string;
  /** "PH-1008"; drafts have none. */
  code?: string;
  /** Public page slug, for published listings. */
  slug?: string;
  title: string;
  mode: ListingMode;
  price?: number;
  image?: { src: string; alt: string };
  status: SellerListingStatus;
  views7d: number;
  leads: number;
  /** Contact rate over the last 7 days, 0–1 (views → leads). */
  contactRate: number;
  /** ISO date a live listing expires. */
  expiresAt?: string;
  promotion?: ActivePromotionDto;
  lastBumpedAt?: string;
  /** Why review failed (rejected). */
  rejectReason?: string;
  /** When it was sent for review (pending_review). */
  submittedAt?: string;
  /** Drafts: the wizard draft and the step to resume at. */
  draftId?: string;
  draftStep?: PostStep;
  /** Drafts: steps finished, out of 5. */
  draftProgress?: number;
  updatedAt: string;
}

/** `GET /me/listings/:id` (FE-24): a listing and the wizard values it is edited with. */
export interface SellerListingEditDto {
  listing: SellerListingDto;
  values: DraftValues;
}

export interface GetSellerListingResponse {
  data: SellerListingEditDto;
}

/**
 * `PATCH /me/listings/:id` saves the edit and keeps the status (published stays live, expired stays
 * expired). `POST /me/listings/:id/resubmit` saves a rejected listing and sends it back to review.
 * Both check every wizard step and answer 422 with the incomplete steps.
 */
export interface UpdateSellerListingRequest {
  values: DraftValues;
}

export type UpdateSellerListingResponse = GetSellerListingResponse;

export type SellerListingSort = "-views" | "-leads" | "-updatedAt" | "expiresAt";
export type SellerListingTab = SellerListingStatus | "all";

/** `GET /me/listings` query string. */
export interface ListSellerListingsQuery {
  status?: SellerListingTab;
  /** Title or code. */
  q?: string;
  mode?: ListingMode;
  sort?: SellerListingSort;
  page?: number;
  /** Default 10, max 50. */
  limit?: number;
  /** Only these ids (the boost dialog). Comma-separated. */
  ids?: string;
}

/** `GET /me/listings` — `counts` per status tab for the other filters, and the 7-day totals for C11. */
export type ListSellerListingsResponse = PaginatedResponse<SellerListingDto> & {
  counts: Record<SellerListingTab, number>;
  totals: { views7d: number; leads: number };
};

export const SELLER_LISTINGS_DEFAULT_LIMIT = 10;
export const SELLER_LISTINGS_MAX_LIMIT = 50;

/**
 * `POST /me/listings/bulk` — `renew` extends live or expired listings by 60 days,
 * `close` takes them down (they stop counting against the quota). Ids that do not
 * allow the action are skipped and listed in `skipped`.
 */
export interface BulkListingsRequest {
  ids: string[];
  action: "renew" | "close";
}

export interface BulkListingsResponse {
  data: { updated: string[]; skipped: string[] };
}

export type BoostKind = "bump" | "auto_bump" | "featured" | "homepage_pin";

/** One option in the boost dialog (C14), with what the package still covers. */
export interface BoostOptionDto {
  kind: BoostKind;
  title: string;
  description: string;
  /** THB per listing, VAT included. */
  price: number;
  days?: number;
  /** Listings the package can still cover for free (bumps quota, featured slots). */
  packageLeft?: number;
  /** Homepage pins left this week. */
  slotsLeft?: number;
  /** Line under the option, e.g. "ประกาศแนะนำในย่านนี้ได้ยอดเข้าชมเพิ่ม 2.6 เท่า". */
  estimate?: string;
}

/** `GET /me/boost-options` */
export type ListBoostOptionsResponse = ListResponse<BoostOptionDto>;

/**
 * `POST /me/listings/promote` — only published listings. The package covers what it can;
 * the rest is taken from credit. 402 `insufficient_credit` when credit is short,
 * 409 when a listing is not published or homepage pins are sold out.
 */
export interface PromoteListingsRequest {
  ids: string[];
  kind: BoostKind;
}

export interface PromoteListingsResponse {
  data: { promoted: string[]; coveredByPackage: number; charged: number; creditLeft: number };
}

/** `GET /me/seller/overview?days=` (C8). */
export interface SellerOverviewDto {
  /** ISO time the stats were computed. */
  updatedAt: string;
  views7d: number;
  viewsPrev7d: number;
  newLeads: number;
  leadsByChannel: { call: number; chat: number; line: number };
  viewingsThisWeek: number;
  /** Share of leads answered within an hour, 0–1. */
  responseRate: number;
  responseMinutes: number;
  /** Daily views across all listings, oldest first, `days` long. */
  dailyViews: { date: string; views: number }[];
  /** A note under the chart, e.g. when a promotion started. */
  chartNote?: string;
  todo: {
    pendingViewings: number;
    /** When the first pending request lapses. */
    firstExpiresAt?: string;
    rejected: number;
    rejectReason?: string;
    /** The first rejected listing, opened in edit mode from the to-do card (FE-24). */
    rejectedListingId?: string;
    expiringSoon: number;
    drafts: number;
    latestDraftTitle?: string;
  };
}

export type OverviewRange = 14 | 30 | 90;

export interface SellerOverviewResponse {
  data: SellerOverviewDto;
}

export type LeadChannel = "call" | "chat" | "line";

/** Anyone who contacted me about a listing (C10 "ผู้สนใจทั้งหมด"). */
export interface LeadDto {
  id: string;
  name: string;
  channel: LeadChannel;
  listingTitle: string;
  listingId: string;
  createdAt: string;
  phoneVerified: boolean;
  /** The chat, for chat leads. */
  threadId?: string;
}

/** `GET /me/leads` — newest first. */
export type ListLeadsResponse = ListResponse<LeadDto>;

/** Hours a lister takes viewings (C10 "เวลารับนัด"). `null` = closed those days. */
export interface AvailabilityDto {
  weekdays: { start: string; end: string } | null;
  weekend: { start: string; end: string } | null;
  /** Minutes kept free between viewings. */
  gapMinutes: number;
}

/** `GET /me/availability`, `PUT /me/availability` (400 when start is not before end). */
export interface AvailabilityResponse {
  data: AvailabilityDto;
}

// ---------------------------------------------------------------------------
// Pricing, checkout and billing (C12, C13, C15)
// ---------------------------------------------------------------------------

export type BillingCycle = "monthly" | "yearly";
export type PaymentStatusDto = "pending" | "paid" | "failed" | "refund_requested" | "refunded";
export type PaymentMethod = "promptpay" | "card" | "credit";
export type OrderKind = "plan" | "credit" | "promotion";

/** VAT rate included in every price (handoff §6). */
export const VAT_RATE = 0.07;

/** Something to pay for. Amounts are THB with VAT included. */
export interface OrderDto {
  id: string;
  kind: OrderKind;
  /** "ประกาศแนะนำ 14 วัน", "แพ็กเกจนายหน้า Pro รายปี", "เติมเครดิต". */
  title: string;
  /** Listing title(s), billing period… */
  detail?: string;
  /** Before discount. */
  listPrice: number;
  discount: number;
  coupon?: string;
  /** To pay, VAT included. */
  amount: number;
  /** `amount` split into the pre-VAT price and VAT, 2 decimals. */
  subtotal: number;
  vat: number;
  status: PaymentStatusDto;
  method?: PaymentMethod;
  /** Card used, e.g. "4242". */
  cardLast4?: string;
  /** Why the last attempt failed. */
  failureReason?: string;
  /** PromptPay: the QR shown and when it stops working. */
  qrPayload?: string;
  qrExpiresAt?: string;
  createdAt: string;
  paidAt?: string;
  /** "INV-2569-000123" once paid. */
  invoiceNo?: string;
  /** Promotions start after review; shown under the summary. */
  note?: string;
  /** Where "back" and "done" go from checkout. */
  backHref: string;
  doneHref: string;
}

export interface OrderResponse {
  data: OrderDto;
}

/** `POST /me/orders` — a pending order to pay at `/checkout/:id`. */
export type CreateOrderRequest =
  | { kind: "plan"; plan: "agent_pro" | "agency"; cycle: BillingCycle }
  | { kind: "credit"; amount: number }
  | { kind: "promotion"; promotion: BoostKind; listingIds: string[] };

/**
 * `POST /me/orders/:id/pay`. PromptPay returns the QR (still `pending`; it turns
 * `paid` by itself once the bank confirms). Card and credit settle at once:
 * 402 when credit is short; a declined card returns the order as `failed`.
 */
export interface PayOrderRequest {
  method: PaymentMethod;
  /** Saved card to charge (card only). */
  cardId?: string;
}

/** `POST /me/orders/:id/coupon` — 400 for an unknown code. */
export interface ApplyCouponRequest {
  code: string;
}

/** `GET /me/orders` — payment history, newest first (orders never paid for are left out). */
export type ListOrdersResponse = ListResponse<OrderDto>;

export interface SavedCardDto {
  id: string;
  brand: "visa" | "mastercard" | "jcb";
  last4: string;
  /** "08/29" */
  expiry: string;
  primary: boolean;
}

export interface TaxProfileDto {
  type: "personal" | "company";
  /** Person or company name on the invoice. */
  name: string;
  /** 13 digits. */
  taxId?: string;
  /** "สำนักงานใหญ่" or a branch number. */
  branch?: string;
  address?: string;
  email: string;
}

/** `GET /me/billing` (C15). */
export interface BillingDto {
  credit: number;
  autoTopUp: boolean;
  plan: SellerPlan;
  planName: string;
  cycle: BillingCycle;
  /** THB per cycle. */
  planPrice: number;
  autoRenew: boolean;
  /** Next charge, or when the plan ends once auto-renew is off. */
  renewsAt: string;
  cards: SavedCardDto[];
  taxProfile: TaxProfileDto;
}

export interface BillingResponse {
  data: BillingDto;
}

/** `PATCH /me/billing` */
export interface UpdateBillingRequest {
  autoRenew?: boolean;
  autoTopUp?: boolean;
  taxProfile?: TaxProfileDto;
}

/** `POST /me/cards` — 400 when the number fails the check. The test number 4000 0000 0000 0002 is always declined. */
export interface AddCardRequest {
  number: string;
  /** "MM/YY" */
  expiry: string;
  name: string;
}

/** Credit top-up amounts offered (THB). */
export const CREDIT_TOP_UPS = [500, 1000, 2000, 5000] as const;

// ---------------------------------------------------------------------------
// Agent verification, KYC (C16)
// ---------------------------------------------------------------------------

export type KycStep = "personal" | "id_card" | "selfie" | "company" | "review";
export type KycDocSlot = "id_front" | "id_back" | "selfie" | "company";

export interface KycDocumentDto {
  slot: KycDocSlot;
  name: string;
  /** Small preview the mock keeps as the stored file. PDFs have none. */
  preview?: string;
  mimeType: string;
  uploadedAt: string;
}

export interface KycPersonalDto {
  firstName: string;
  lastName: string;
  /** 13-digit Thai ID number. */
  idNumber: string;
  /** ISO date. */
  birthDate: string;
  phone: string;
}

export interface KycCompanyDto {
  name: string;
  /** Broker licence or company registration number, optional. */
  registrationNo?: string;
}

/** `GET /me/kyc` — the agent's verification. Files are only used to verify and never shown on listings. */
export interface KycDto {
  status: SellerKycStatus;
  personal?: KycPersonalDto;
  documents: KycDocumentDto[];
  company?: KycCompanyDto;
  /** The optional company step was skipped on purpose. */
  companySkipped: boolean;
  /** Steps whose data is complete, in order. */
  completedSteps: KycStep[];
  submittedAt?: string;
  reviewedAt?: string;
  /** Reviewer's message for `needs_info` and `rejected`. */
  reviewNote?: string;
  /** `needs_info`: the steps to redo. */
  fixSteps?: KycStep[];
}

export interface KycResponse {
  data: KycDto;
}

/** `PATCH /me/kyc` — save a step. 400 with field messages when a value is invalid. Locked (409) while submitted or approved. */
export interface UpdateKycRequest {
  personal?: KycPersonalDto;
  company?: KycCompanyDto | null;
  companySkipped?: boolean;
}

/** `POST /me/kyc/documents` — the file's metadata and a preview (like listing photos). 400 for a wrong type or size. */
export interface UploadKycDocumentRequest {
  slot: KycDocSlot;
  name: string;
  mimeType: string;
  /** Bytes. */
  size: number;
  preview?: string;
}

/** Most bytes for one verification file. */
export const KYC_MAX_FILE_BYTES = 10 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Report a listing (D6)
// ---------------------------------------------------------------------------

export type ReportReason = "scam" | "inaccurate" | "unavailable" | "duplicate" | "other";

export const REPORT_DETAILS_MAX = 1000;

/** `POST /properties/:slug/reports` — anonymous to the poster. `details` is required for `other`. 404 for unknown listings. */
export interface CreateReportRequest {
  reason: ReportReason;
  details?: string;
}

export interface CreateReportResponse {
  data: { id: string; createdAt: string };
}

// ---------------------------------------------------------------------------
// Admin (admin subdomain, its own session; routes under `/admin`)
// ---------------------------------------------------------------------------

export type AdminRoleId = "super_admin" | "moderator" | "kyc_reviewer" | "finance" | "revenue" | "editor";

/** Areas of the admin app; roles grant access per area (see `lib/admin.ts`). */
export type AdminSection =
  "dashboard" | "moderation" | "reports" | "kyc" | "users" | "revenue" | "promo-slots" | "cms" | "roles";

export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  role: AdminRoleId;
  /** Job title shown under the name, e.g. "Moderator lead". */
  title: string;
}

/** `POST /admin/auth/login` body. Step 1 of 2: the password. */
export interface AdminLoginRequest {
  email: string;
  password: string;
}

/** Step 1 passed: a 2FA challenge, valid for 5 minutes. 401 on a wrong email or password. */
export interface AdminLoginResponse {
  data: { challengeId: string; method: "totp"; name: string; email: string; expiresAt: string };
}

/** `POST /admin/auth/2fa` body. 401 on a wrong code, 429 after 5 wrong codes, 410 when the challenge expired. */
export interface AdminVerifyRequest {
  challengeId: string;
  /** 6 digits from the authenticator app. */
  code: string;
}

export interface AdminSessionResponse {
  data: AdminUserDto;
}

/** `GET /admin/auth/me` — `null` when signed out or idle for 30 minutes. */
export interface GetAdminSessionResponse {
  data: AdminUserDto | null;
}

export const ADMIN_IDLE_MINUTES = 30;

/** `GET /admin/queue-counts` — badges in the admin sidebar. */
export interface AdminQueueCountsResponse {
  data: { moderation: number; reports: number; kyc: number };
}

export type AdminAlertSeverity = "high" | "medium" | "low";

export interface AdminAlertDto {
  id: string;
  severity: AdminAlertSeverity;
  title: string;
  detail: string;
  /** Where the alert is handled. */
  section: AdminSection;
}

export interface AdminReviewerStatDto {
  adminId: string;
  name: string;
  reviewed: number;
  /** Average minutes per review. */
  avgMinutes: number;
  /** Share of decisions appealed by the lister, 0–100. */
  disputedPct: number;
}

/** `GET /admin/dashboard` (E1). Refreshed every 5 minutes. */
export interface AdminDashboardDto {
  /** ISO date-time the figures were computed. */
  updatedAt: string;
  kpis: {
    pendingListings: { count: number; overSla: number };
    openReports: { count: number; scam: number };
    pendingKyc: { count: number; oldestHours: number };
    revenueToday: { amount: number; changePct: number; comparedTo: string };
    newListings: { count: number; autoApprovedPct: number };
    newUsers: { count: number; agents: number };
  };
  /** 24 hours, Bangkok time. `count` is null for hours still to come. */
  hourly: { hour: number; count: number | null; average: number }[];
  alerts: AdminAlertDto[];
  team: AdminReviewerStatDto[];
  /** Automated listing review, last 7 days, percentages. */
  automation: {
    autoApprovedPct: number;
    spotCheckPct: number;
    toReviewerPct: number;
    autoRejectedPct: number;
    autoRejectReasons: string[];
    accuracyPct: number;
  };
}

export interface GetAdminDashboardResponse {
  data: AdminDashboardDto;
}

export interface AdminRoleDto {
  id: AdminRoleId;
  name: string;
  /** What the role can do, in one line. */
  description: string;
  members: number;
  sections: AdminSection[];
}

/** `GET /admin/roles` (E10). */
export type ListAdminRolesResponse = ListResponse<AdminRoleDto>;

export interface AuditEntryDto {
  id: string;
  /** ISO date-time. */
  at: string;
  actor: { name: string; role: AdminRoleId };
  action: string;
  /** Ticket or reason, empty when none. */
  note: string;
}

/** `GET /admin/audit-log?date=YYYY-MM-DD` — newest first, Bangkok day. Read-only: there is no write endpoint. */
export type ListAuditLogResponse = ListResponse<AuditEntryDto>;

/** `POST /admin/invites` — super admins only (403 otherwise). 409 when the email is already an admin. */
export interface CreateAdminInviteRequest {
  email: string;
  role: AdminRoleId;
}

export interface CreateAdminInviteResponse {
  data: { email: string; role: AdminRoleId; expiresAt: string };
}

// --- Admin: listing moderation (E2, E3) ---------------------------------------

export type ModerationTab = "pending" | "returned" | "spot_check" | "done";

export type ModerationFlagCode =
  "phone_in_photo" | "price_below_market" | "duplicate_photos" | "new_account" | "resubmitted";

/** Raised by the automated review. `photoIndex` (0-based) points at the photo it is about. */
export interface ModerationFlagDto {
  code: ModerationFlagCode;
  label: string;
  tone: "danger" | "warning" | "neutral";
  photoIndex?: number;
  /** 0–1, for OCR and image matches. */
  confidence?: number;
  /** One sentence for the reviewer, e.g. what was found and where. */
  detail?: string;
}

export type ModerationReturnReason = "contact_in_photo" | "price" | "incomplete" | "duplicate" | "scam";

export interface ModerationDecisionDto {
  outcome: "approved" | "returned";
  reasons: ModerationReturnReason[];
  /** Sent to the lister when returned. */
  message: string;
  by: string;
  at: string;
}

export interface ModerationPosterDto {
  userId: string;
  name: string;
  kind: "agent" | "owner";
  /** "นายหน้า Pro", "เจ้าของ (ใหม่)". */
  badge: string;
  accountAgeDays: number;
  listings: number;
  returnedLast90d: number;
  reportsCount: number;
  kycApproved: boolean;
}

/** One listing waiting for (or past) human review. `id` is the listing code, e.g. "PH-2291". */
export interface ModerationItemDto {
  id: string;
  status: ModerationTab;
  listing: PropertyDetailDto;
  /** Where the asking price sits against the project or area. */
  marketBand: "below" | "market" | "above";
  poster: ModerationPosterDto;
  /** Paid promotion that starts once the listing passes (handoff §6). */
  promotion?: { label: string; amount: number };
  flags: ModerationFlagDto[];
  /** Checklist with the automated review's suggestion for each line. */
  checks: { id: string; label: string; passed: boolean }[];
  submittedAt: string;
  decision?: ModerationDecisionDto;
}

export type ModerationSort = "paid_first" | "oldest" | "newest";

export interface ListModerationQuery {
  tab?: ModerationTab;
  /** `any` (default), `flagged` or `clean`. */
  flags?: "any" | "flagged" | "clean";
  poster?: "all" | "agent" | "owner";
  paid?: boolean;
  sort?: ModerationSort;
  page?: number;
}

export const MODERATION_PAGE_SIZE = 20;
/** Review SLA in minutes (handoff §6). */
export const MODERATION_SLA_MINUTES = 120;

/** `GET /admin/moderation` — `counts` per tab (other filters ignored). */
export interface ListModerationResponse {
  data: ModerationItemDto[];
  meta: PageMeta;
  counts: Record<ModerationTab, number>;
}

/** `GET /admin/moderation/:id` — with its place in the pending queue for prev/next. */
export interface GetModerationItemResponse {
  data: ModerationItemDto;
  queue: { position: number; total: number; prevId?: string; nextId?: string };
}

/** `POST /admin/moderation/:id/approve` and `/return`. 409 when already decided. */
export interface ReturnListingRequest {
  reasons: ModerationReturnReason[];
  message: string;
}

/** `POST /admin/moderation/approve` — bulk approve from the queue. Skips decided items. */
export interface BulkApproveRequest {
  ids: string[];
}

export interface ModerationDecisionResponse {
  data: ModerationItemDto;
  /** The next pending item, so continuous review can move on. */
  nextId?: string;
}

// --- Admin: user reports (E4) -------------------------------------------------

export type ReportSeverity = "high" | "medium" | "low";
export type ReportCaseStatus = "open" | "awaiting_reporter" | "resolved" | "dismissed";
export type ReportCaseTab = "open" | "awaiting_reporter" | "closed";
export type ReportAction = "suspend" | "hide_listing" | "warn" | "dismiss" | "request_info";

export interface ReportCaseDto {
  id: string;
  severity: ReportSeverity;
  status: ReportCaseStatus;
  reason: ReportReason;
  title: string;
  listing: { code: string; slug: string; title: string; hidden: boolean };
  reported: { userId: string; name: string; accountAgeDays: number; listings: number; suspended: boolean };
  reportCount: number;
  /** The automated review flagged it too. */
  systemFlag: boolean;
  reporters: { count: number; verified: number };
  quotes: { text: string; at: string; reporter: string }[];
  /** Chat messages attached as evidence. */
  evidenceMessages: number;
  assignee?: string;
  openedAt: string;
  resolution?: { action: ReportAction; by: string; at: string; note: string };
}

/** Hours to close a case, by severity. */
export const REPORT_SLA_HOURS: Record<ReportSeverity, number> = { high: 4, medium: 24, low: 72 };
/** A listing is hidden automatically at this many reports (handoff §6). */
export const REPORT_AUTO_HIDE = 3;

/** `GET /admin/reports?tab=` — highest severity first, then oldest. */
export interface ListReportCasesResponse {
  data: ReportCaseDto[];
  counts: Record<ReportCaseTab, number>;
}

/** `POST /admin/reports/:id/actions`. 409 once the case is closed. */
export interface ReportActionRequest {
  action: ReportAction;
  note?: string;
}

export interface ReportCaseResponse {
  data: ReportCaseDto;
}

// --- Admin: agent KYC review (E5) ---------------------------------------------

export type KycApplicationStatus = "pending" | "needs_info" | "approved" | "rejected";

export interface KycCheckDto {
  label: string;
  entered?: string;
  fromDocument?: string;
  result: "match" | "mismatch" | "pass" | "fail" | "optional";
  resultLabel: string;
}

export interface KycApplicationDto {
  id: string;
  userId: string;
  name: string;
  /** Company name, or "อิสระ". */
  affiliation: string;
  attempt: number;
  status: KycApplicationStatus;
  submittedAt: string;
  idCard: { ocrName: string; idMasked: string; expiresYear: number };
  /** Face match between the selfie and the ID photo, 0–1. */
  faceMatch: number;
  checks: KycCheckDto[];
  decidedAt?: string;
  decidedBy?: string;
  note?: string;
}

export type KycDecision = "approve" | "reject" | "request_info";

/** `GET /admin/kyc?tab=` — oldest first. Documents are not included; see `/view`. */
export interface ListKycApplicationsResponse {
  data: KycApplicationDto[];
  counts: Record<KycApplicationStatus, number>;
}

/** `POST /admin/kyc/:id/view` — opening the documents is logged with a reason. */
export interface ViewKycDocumentsRequest {
  reason: string;
}

/** `POST /admin/kyc/:id/decision` — a note is required to reject or ask for more. 409 once decided. */
export interface KycDecisionRequest {
  decision: KycDecision;
  note?: string;
}

export interface KycApplicationResponse {
  data: KycApplicationDto;
}

// --- Admin: users (E6) ---------------------------------------------------------

export type AdminUserKind = "seeker" | "owner" | "agent" | "agent_pro" | "agency";
/** handoff §4: `active`, `suspended`, `banned`, `pending_kyc`. */
export type AdminUserStatus = "active" | "suspended" | "banned" | "pending_kyc";
export type AdminUserJoined = "all" | "7d" | "30d" | "90d";

export interface AdminUserRowDto {
  id: string;
  name: string;
  /** Masked email or phone, e.g. "kittipat@…" or "08x-xxx-4412". */
  contact: string;
  kind: AdminUserKind;
  status: AdminUserStatus;
  listings: number;
  /** THB paid in total. */
  totalPaid: number;
  joinedAt: string;
  /** Number shared with other accounts (fraud signal). */
  sharedPhone: boolean;
}

export interface AdminUserDetailDto extends AdminUserRowDto {
  joinedVia: "email" | "google" | "line";
  phoneVerified: boolean;
  /** Other accounts on the same phone number. */
  sharedPhoneWith: { id: string; name: string; status: AdminUserStatus }[];
  device: string;
  /** Network note, e.g. the IP matches a suspended account. */
  networkNote?: string;
  suspension?: { at: string; by: string; reason: string };
  listingItems: { code: string; title: string; slug: string; hidden: boolean }[];
  reports: { id: string; title: string; status: ReportCaseStatus }[];
  payments: { id: string; at: string; item: string; amount: number; status: PaymentStatusDto }[];
  /** Admin actions about this user, newest first. */
  activity: AuditEntryDto[];
}

export interface ListAdminUsersQuery {
  kind?: AdminUserKind | "all";
  status?: AdminUserStatus | "all";
  joined?: AdminUserJoined;
  q?: string;
  /** Accounts that share a phone with this user id. */
  sharedWith?: string;
  page?: number;
}

export const ADMIN_USERS_PAGE_SIZE = 20;

/** `GET /admin/users` — `platformTotal` counts every account, not just the filtered ones. */
export interface ListAdminUsersResponse {
  data: AdminUserRowDto[];
  meta: PageMeta;
  platformTotal: number;
}

export interface AdminUserResponse {
  data: AdminUserDetailDto;
}

export type AdminUserAction = "suspend" | "unsuspend" | "ban" | "message";

/** `POST /admin/users/:id/actions`. `reason` for suspend and ban, `message` for message. 409 when the status does not allow it. */
export interface AdminUserActionRequest {
  action: AdminUserAction;
  reason?: string;
  message?: string;
}

/** `POST /admin/users/:id/reveal-phone` — the full number, logged with the reason. */
export interface RevealPhoneResponse {
  data: { phone: string };
}

// --- Admin: revenue and refunds (E7) -------------------------------------------

export type RevenueProduct = "agent_plan" | "featured" | "homepage_pin" | "bump";

export interface RefundRequestDto {
  paymentId: string;
  customer: string;
  reason: string;
  amount: number;
  requestedAt: string;
  /** Over ฿1,000: only Finance (or a super admin) may approve (handoff §6). */
  needsFinance: boolean;
}

/** Refunds above this need Finance (handoff §6). */
export const REFUND_FINANCE_THRESHOLD = 1_000;

export interface AdminRevenueDto {
  /** "2026-11". */
  month: string;
  /** Last day included (ISO date). */
  through: string;
  kpis: {
    revenue: number;
    changePct: number;
    members: { total: number; pro: number; agency: number };
    churnPct: number;
    churnTargetPct: number;
    refunds: { amount: number; count: number };
  };
  byProduct: { product: RevenueProduct; amount: number }[];
  refundRequests: RefundRequestDto[];
}

export interface GetAdminRevenueResponse {
  data: AdminRevenueDto;
  /** Months with data, newest first. */
  months: string[];
}

export type AdminPaymentStatus = PaymentStatusDto | "awaiting_review";

export interface AdminPaymentDto {
  id: string;
  at: string;
  customer: string;
  item: string;
  amount: number;
  method: PaymentMethod;
  status: AdminPaymentStatus;
}

export const ADMIN_PAYMENTS_PAGE_SIZE = 10;

/** `GET /admin/payments?page=` — newest first. */
export interface ListAdminPaymentsResponse {
  data: AdminPaymentDto[];
  meta: PageMeta;
}

/** `POST /admin/refunds/:paymentId` — 403 when the amount needs Finance. 409 once decided. */
export interface RefundDecisionRequest {
  decision: "approve" | "reject";
  note?: string;
}

// --- Admin: homepage pin slots (E8) ----------------------------------------------

export interface PromoSettingsDto {
  /** THB for 7 days. */
  priceWeek: number;
  slotsPerDay: number;
  /** Slots per day kept for partner contracts. */
  partnerReserved: number;
  /** Most pins per district per day. */
  districtCap: number;
}

export interface PromoPinDto {
  id: string;
  listing: { code: string; title: string; slug: string; district: string };
  buyer: string;
  /** Bangkok days, "2026-11-17", inclusive. */
  start: string;
  end: string;
  source: "purchase" | "partner";
}

export interface PromoDayDto {
  date: string;
  /** Pins bought for the day. */
  sold: number;
  /** Partner pins (inside the reserved slots). */
  partner: number;
  capacity: number;
}

/** `GET /admin/promo-slots?week=YYYY-MM-DD` (any day; the week starts Monday). */
export interface GetPromoSlotsResponse {
  data: { weekStart: string; days: PromoDayDto[]; pins: PromoPinDto[]; settings: PromoSettingsDto };
}

/** `POST /admin/promo-slots/pins/:id/move` — 409 names the first day that is full or over the district cap. */
export interface MovePinRequest {
  start: string;
}

export interface MovePinConflict {
  statusCode: 409;
  message: string;
  error: string;
  day: string;
  reason: "full" | "district";
}

/** `PUT /admin/promo-slots/settings` — 400 when out of range. */
export type UpdatePromoSettingsRequest = PromoSettingsDto;

// --- Admin: CMS (E9) ---------------------------------------------------------------

export type CmsStatus = "draft" | "in_review" | "scheduled" | "published";

export interface CmsRevisionDto {
  id: string;
  at: string;
  by: string;
  note: string;
}

export interface CmsArticleDto {
  /** Stable id; the slug can change. */
  id: string;
  slug: string;
  title: string;
  category: ArticleCategory;
  tags: string[];
  cover: { src: string; alt: string };
  /** Meta description, max 160 characters. */
  seoDescription: string;
  body: ArticleBlock[];
  status: CmsStatus;
  reviewer?: string;
  scheduledAt?: string;
  publishedAt?: string;
  updatedAt: string;
  updatedBy: string;
  revisions: CmsRevisionDto[];
}

export type CmsArticleSummaryDto = Omit<CmsArticleDto, "body" | "revisions">;

export const SEO_DESCRIPTION_MAX = 160;

/** `GET /admin/cms` — newest change first. */
export type ListCmsArticlesResponse = ListResponse<CmsArticleSummaryDto>;

export interface CmsArticleResponse {
  data: CmsArticleDto;
}

/** `PUT /admin/cms/:id` — saves a revision. 400 for invalid fields, 409 when the slug is taken. */
export type SaveCmsArticleRequest = Pick<
  CmsArticleDto,
  "slug" | "title" | "category" | "tags" | "cover" | "seoDescription" | "body"
>;

/** `POST /admin/cms/:id/publish` — now, or at `at` (scheduled). */
export interface PublishCmsArticleRequest {
  at?: string;
}

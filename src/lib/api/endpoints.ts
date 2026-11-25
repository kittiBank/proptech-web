import type {
  AvailabilityDto,
  AvailabilityResponse,
  BulkListingsRequest,
  BulkListingsResponse,
  ListBoostOptionsResponse,
  ListLeadsResponse,
  ListSellerListingsQuery,
  ListSellerListingsResponse,
  OverviewRange,
  PromoteListingsRequest,
  PromoteListingsResponse,
  SellerAccountResponse,
  SellerOverviewResponse,
  CreateViewingRequest,
  ListAppointmentsResponse,
  ListThreadsResponse,
  MessageDto,
  ThreadDetailResponse,
  ThreadDto,
  ThreadFilter,
  UpdateViewingRequest,
  ViewingRequestDto,
  ViewingSlotsResponse,
  ChangePasswordRequest,
  ListNotificationsResponse,
  NotificationKind,
  ProfileResponse,
  UpdateProfileRequest,
  UpdateSavedSearchRequest,
  VerifyPhoneRequest,
  CreateSavedSearchRequest,
  ListSavedSearchesResponse,
  SavedSearchResponse,
  UnreadCountsResponse,
  GetSessionResponse,
  GetArticleResponse,
  ListArticlesQuery,
  ListArticlesResponse,
  DraftResponse,
  ListDraftsResponse,
  ListingQuotaResponse,
  ListPromotionsResponse,
  NearbyStationsResponse,
  PublishDraftResponse,
  SearchProjectPlacesResponse,
  SubmissionResponse,
  UpdateDraftRequest,
  UploadPhotoRequest,
  UploadPhotoResponse,
  ForgotPasswordRequest,
  LoginRequest,
  OAuthProvider,
  OnboardingRequest,
  RegisterRequest,
  ResetPasswordRequest,
  SessionResponse,
  CompareListingsResponse,
  ListFavoritesResponse,
  SaveFavoriteResponse,
  CreateEnquiryRequest,
  CreateEnquiryResponse,
  CreateProjectViewingRequest,
  CreateProjectViewingResponse,
  GetAgentResponse,
  GetProjectResponse,
  GetPropertyResponse,
  ListNearbyProjectsResponse,
  ListNearbyPropertiesQuery,
  ListNearbyPropertiesResponse,
  ListAdsQuery,
  ListAdsResponse,
  ListCategoriesResponse,
  ListProjectsQuery,
  ListProjectsResponse,
  ListPropertiesQuery,
  ListPropertiesResponse,
  ListStationsResponse,
} from "@/types/api";
import { apiGet, apiPost, apiSend } from "./client";

/** One function per REST endpoint. Components use these through `queries.ts`, never directly. */
export const api = {
  /** GET /properties — paginated, filterable listings. */
  listProperties: (query: ListPropertiesQuery = {}, signal?: AbortSignal) =>
    apiGet<ListPropertiesResponse>("/properties", { ...query }, { signal }),

  /** GET /properties/:slug — one listing with everything the listing page shows. */
  getProperty: (slug: string, signal?: AbortSignal) =>
    apiGet<GetPropertyResponse>(`/properties/${encodeURIComponent(slug)}`, undefined, { signal }),

  /** GET /properties/:slug/nearby — closest other listings. */
  listNearbyProperties: (slug: string, query: ListNearbyPropertiesQuery = {}, signal?: AbortSignal) =>
    apiGet<ListNearbyPropertiesResponse>(`/properties/${encodeURIComponent(slug)}/nearby`, { ...query }, { signal }),

  /** POST /properties/:slug/enquiries — message to the poster. */
  createEnquiry: (slug: string, body: CreateEnquiryRequest) =>
    apiPost<CreateEnquiryResponse, CreateEnquiryRequest>(`/properties/${encodeURIComponent(slug)}/enquiries`, body),

  /** GET /projects — paginated, filterable developer projects with per-status counts. */
  listProjects: (query: ListProjectsQuery = {}, signal?: AbortSignal) =>
    apiGet<ListProjectsResponse>("/projects", { ...query }, { signal }),

  /** GET /projects/:slug — one project with everything the project page shows. */
  getProject: (slug: string, signal?: AbortSignal) =>
    apiGet<GetProjectResponse>(`/projects/${encodeURIComponent(slug)}`, undefined, { signal }),

  /** GET /projects/:slug/nearby — closest other projects. */
  listNearbyProjects: (slug: string, limit: number, signal?: AbortSignal) =>
    apiGet<ListNearbyProjectsResponse>(`/projects/${encodeURIComponent(slug)}/nearby`, { limit }, { signal }),

  /** POST /projects/:slug/viewings — ask the sales team for a show-unit visit. */
  createProjectViewing: (slug: string, body: CreateProjectViewingRequest) =>
    apiPost<CreateProjectViewingResponse, CreateProjectViewingRequest>(
      `/projects/${encodeURIComponent(slug)}/viewings`,
      body,
    ),

  /** GET /agents/:slug — public agent profile. Their listings come from `GET /properties?agent=`. */
  getAgent: (slug: string, signal?: AbortSignal) =>
    apiGet<GetAgentResponse>(`/agents/${encodeURIComponent(slug)}`, undefined, { signal }),

  /** GET /articles — guide articles, newest first. */
  listArticles: (query: ListArticlesQuery = {}, signal?: AbortSignal) =>
    apiGet<ListArticlesResponse>("/articles", { ...query }, { signal }),

  /** GET /articles/:slug — one article with its body. */
  getArticle: (slug: string, signal?: AbortSignal) =>
    apiGet<GetArticleResponse>(`/articles/${encodeURIComponent(slug)}`, undefined, { signal }),

  /** GET /stations — BTS/MRT stations grouped by line. */
  listStations: (signal?: AbortSignal) => apiGet<ListStationsResponse>("/stations", undefined, { signal }),

  /** GET /categories — property types with listing counts. */
  listCategories: (signal?: AbortSignal) => apiGet<ListCategoriesResponse>("/categories", undefined, { signal }),

  /** GET /ads — sponsored banners for one placement. */
  listAds: (query: ListAdsQuery, signal?: AbortSignal) => apiGet<ListAdsResponse>("/ads", { ...query }, { signal }),

  /** GET /me/favorites — the signed-in user's saved listings, newest first. */
  listFavorites: (signal?: AbortSignal) => apiGet<ListFavoritesResponse>("/me/favorites", undefined, { signal }),

  /** PUT /me/favorites/:propertyId — save a listing (idempotent). */
  saveFavorite: (propertyId: string) =>
    apiSend<SaveFavoriteResponse>("PUT", `/me/favorites/${encodeURIComponent(propertyId)}`),

  /** PATCH /me/favorites/:propertyId — change the private note. */
  updateFavoriteNote: (propertyId: string, note: string) =>
    apiSend<SaveFavoriteResponse>("PATCH", `/me/favorites/${encodeURIComponent(propertyId)}`, { note }),

  /** DELETE /me/favorites/:propertyId — unsave a listing. */
  removeFavorite: (propertyId: string) => apiSend<void>("DELETE", `/me/favorites/${encodeURIComponent(propertyId)}`),

  /** GET /compare?ids= — details of up to 3 listings side by side. */
  compareListings: (ids: string[], signal?: AbortSignal) =>
    apiGet<CompareListingsResponse>("/compare", { ids: ids.join(",") }, { signal }),

  /** GET /auth/me — the signed-in user; 401 when signed out. */
  getSession: (signal?: AbortSignal) => apiGet<GetSessionResponse>("/auth/me", undefined, { signal }),

  /** POST /auth/login */
  login: (body: LoginRequest) => apiSend<SessionResponse>("POST", "/auth/login", body),

  /** POST /auth/register — signs the new account in. */
  register: (body: RegisterRequest) => apiSend<SessionResponse>("POST", "/auth/register", body),

  /** POST /auth/oauth/:provider — mock stand-in for the Google/LINE redirect round trip. */
  oauthLogin: (provider: OAuthProvider) => apiSend<SessionResponse>("POST", `/auth/oauth/${provider}`),

  /** POST /auth/logout */
  logout: () => apiSend<void>("POST", "/auth/logout"),

  /** POST /auth/verify-email */
  verifyEmail: (token: string) => apiSend<SessionResponse>("POST", "/auth/verify-email", { token }),

  /** POST /auth/resend-verification — 202. */
  resendVerification: () => apiSend<void>("POST", "/auth/resend-verification"),

  /** POST /auth/forgot-password — 202 whether or not the account exists. */
  forgotPassword: (body: ForgotPasswordRequest) => apiSend<void>("POST", "/auth/forgot-password", body),

  /** POST /auth/reset-password — 204; signs out every device. */
  resetPassword: (body: ResetPasswordRequest) => apiSend<void>("POST", "/auth/reset-password", body),

  /** PATCH /me/onboarding */
  completeOnboarding: (body: OnboardingRequest) => apiSend<SessionResponse>("PATCH", "/me/onboarding", body),

  /** GET /me/saved-searches — newest first. */
  listSavedSearches: (signal?: AbortSignal) =>
    apiGet<ListSavedSearchesResponse>("/me/saved-searches", undefined, { signal }),

  /** POST /me/saved-searches — 201 new, 200 when that query is already saved, 409 at the limit. */
  createSavedSearch: (body: CreateSavedSearchRequest) =>
    apiSend<SavedSearchResponse>("POST", "/me/saved-searches", body),

  /** PATCH /me/saved-searches/:id — rename or change alerts. */
  updateSavedSearch: (id: string, body: UpdateSavedSearchRequest) =>
    apiSend<SavedSearchResponse>("PATCH", `/me/saved-searches/${encodeURIComponent(id)}`, body),

  /** DELETE /me/saved-searches/:id */
  deleteSavedSearch: (id: string) => apiSend<void>("DELETE", `/me/saved-searches/${encodeURIComponent(id)}`),

  /** GET /me/profile — personal info, security and settings (B7). */
  getProfile: (signal?: AbortSignal) => apiGet<ProfileResponse>("/me/profile", undefined, { signal }),

  /** PATCH /me/profile */
  updateProfile: (body: UpdateProfileRequest) => apiSend<ProfileResponse>("PATCH", "/me/profile", body),

  /** POST /me/phone/otp — texts a code to the profile phone (202). */
  sendPhoneOtp: () => apiSend<void>("POST", "/me/phone/otp"),

  /** POST /me/phone/verify — 400 on a wrong code. */
  verifyPhone: (body: VerifyPhoneRequest) => apiSend<ProfileResponse>("POST", "/me/phone/verify", body),

  /** POST /me/password — 204; 400 when the current password is wrong. */
  changePassword: (body: ChangePasswordRequest) => apiSend<void>("POST", "/me/password", body),

  /** POST or DELETE /me/linked/:provider — link or unlink a sign-in provider. */
  setLinkedAccount: (provider: "google" | "line", linked: boolean) =>
    apiSend<ProfileResponse>(linked ? "POST" : "DELETE", `/me/linked/${provider}`),

  /** POST /me/sessions/revoke-others — signs out every other device. */
  signOutOtherDevices: () => apiSend<void>("POST", "/me/sessions/revoke-others"),

  /** POST /me/data-export — PDPA data copy, emailed later (202). */
  requestDataExport: () => apiSend<void>("POST", "/me/data-export"),

  /** DELETE /me — deletes the account and signs out. */
  deleteAccount: () => apiSend<void>("DELETE", "/me"),

  /** GET /me/notifications?kind= — newest first. */
  listNotifications: (kind?: NotificationKind, signal?: AbortSignal) =>
    apiGet<ListNotificationsResponse>("/me/notifications", { kind }, { signal }),

  /** PATCH /me/notifications/:id — marks one read. */
  markNotificationRead: (id: string) =>
    apiSend<void>("PATCH", `/me/notifications/${encodeURIComponent(id)}`, { read: true }),

  /** POST /me/notifications/read-all */
  markAllNotificationsRead: () => apiSend<void>("POST", "/me/notifications/read-all"),

  /** GET /me/threads?filter= — chats, newest activity first. */
  listThreads: (filter: ThreadFilter = "all", signal?: AbortSignal) =>
    apiGet<ListThreadsResponse>("/me/threads", { filter }, { signal }),

  /** GET /me/threads/:id — one chat with its messages and viewing requests. */
  getThread: (id: string, signal?: AbortSignal) =>
    apiGet<ThreadDetailResponse>(`/me/threads/${encodeURIComponent(id)}`, undefined, { signal }),

  /** POST /me/threads — open or start the chat with "agent:<slug>", "property:<slug>" or "project:<slug>". */
  startThread: (to: string) => apiSend<{ data: ThreadDto }>("POST", "/me/threads", { to }),

  /** POST /me/threads/:id/read */
  markThreadRead: (id: string) => apiSend<void>("POST", `/me/threads/${encodeURIComponent(id)}/read`),

  /** POST /me/threads/:id/messages */
  sendMessage: (id: string, text: string) =>
    apiSend<{ data: MessageDto }>("POST", `/me/threads/${encodeURIComponent(id)}/messages`, { text }),

  /** GET /me/threads/:id/slots — bookable viewing hours for the next week. */
  getViewingSlots: (id: string, signal?: AbortSignal) =>
    apiGet<ViewingSlotsResponse>(`/me/threads/${encodeURIComponent(id)}/slots`, undefined, { signal }),

  /** POST /me/threads/:id/viewings — buyer asks for a viewing (403 lister, 409 while one is open). */
  createViewing: (id: string, body: CreateViewingRequest) =>
    apiSend<{ data: ViewingRequestDto }>("POST", `/me/threads/${encodeURIComponent(id)}/viewings`, body),

  /** GET /me/viewings — every viewing in the user's chats. */
  listAppointments: (signal?: AbortSignal) => apiGet<ListAppointmentsResponse>("/me/viewings", undefined, { signal }),

  /** PATCH /me/viewings/:id — cancel / accept (buyer), confirm / decline / propose (lister). */
  updateViewing: (id: string, body: UpdateViewingRequest) =>
    apiSend<{ data: ViewingRequestDto }>("PATCH", `/me/viewings/${encodeURIComponent(id)}`, body),

  /** GET /me/unread-counts — unread messages and notifications. */
  getUnreadCounts: (signal?: AbortSignal) => apiGet<UnreadCountsResponse>("/me/unread-counts", undefined, { signal }),

  /** GET /me/seller — package, credit and badges for the seller dashboard. */
  getSellerAccount: (signal?: AbortSignal) => apiGet<SellerAccountResponse>("/me/seller", undefined, { signal }),

  /** GET /me/seller/overview?days= — KPIs, daily views and the to-do list (C8). */
  getSellerOverview: (days: OverviewRange, signal?: AbortSignal) =>
    apiGet<SellerOverviewResponse>("/me/seller/overview", { days }, { signal }),

  /** GET /me/listings — my listings with per-status counts (C9, C11). */
  listSellerListings: (query: ListSellerListingsQuery = {}, signal?: AbortSignal) =>
    apiGet<ListSellerListingsResponse>("/me/listings", { ...query }, { signal }),

  /** POST /me/listings/bulk — renew or close several listings. */
  bulkUpdateListings: (body: BulkListingsRequest) => apiSend<BulkListingsResponse>("POST", "/me/listings/bulk", body),

  /** GET /me/boost-options — boost products with what the package still covers (C14). */
  listBoostOptions: (signal?: AbortSignal) =>
    apiGet<ListBoostOptionsResponse>("/me/boost-options", undefined, { signal }),

  /** POST /me/listings/promote — 402 when credit is short. */
  promoteListings: (body: PromoteListingsRequest) =>
    apiSend<PromoteListingsResponse>("POST", "/me/listings/promote", body),

  /** GET /me/leads — everyone who contacted me, newest first. */
  listLeads: (signal?: AbortSignal) => apiGet<ListLeadsResponse>("/me/leads", undefined, { signal }),

  /** GET /me/availability — the hours buyers may book viewings. */
  getAvailability: (signal?: AbortSignal) => apiGet<AvailabilityResponse>("/me/availability", undefined, { signal }),

  /** PUT /me/availability */
  updateAvailability: (body: AvailabilityDto) => apiSend<AvailabilityResponse>("PUT", "/me/availability", body),

  /** GET /me/drafts — unfinished listing drafts, newest first. */
  listDrafts: (signal?: AbortSignal) => apiGet<ListDraftsResponse>("/me/drafts", undefined, { signal }),

  /** POST /me/drafts — start a new listing. */
  createDraft: () => apiSend<DraftResponse>("POST", "/me/drafts"),

  /** GET /me/drafts/:id */
  getDraft: (id: string, signal?: AbortSignal) =>
    apiGet<DraftResponse>(`/me/drafts/${encodeURIComponent(id)}`, undefined, { signal }),

  /** PATCH /me/drafts/:id — auto-save. */
  updateDraft: (id: string, body: UpdateDraftRequest) =>
    apiSend<DraftResponse>("PATCH", `/me/drafts/${encodeURIComponent(id)}`, body),

  /** DELETE /me/drafts/:id */
  deleteDraft: (id: string) => apiSend<void>("DELETE", `/me/drafts/${encodeURIComponent(id)}`),

  /** POST /me/drafts/:id/photos — returns the stored photo, possibly rejected with a reason. */
  uploadPhoto: (id: string, body: UploadPhotoRequest) =>
    apiSend<UploadPhotoResponse>("POST", `/me/drafts/${encodeURIComponent(id)}/photos`, body),

  /** POST /me/drafts/:id/publish — sends the listing for review. */
  publishDraft: (id: string) => apiSend<PublishDraftResponse>("POST", `/me/drafts/${encodeURIComponent(id)}/publish`),

  /** GET /me/drafts/:id/submission — the listing a published draft became. */
  getSubmission: (id: string, signal?: AbortSignal) =>
    apiGet<SubmissionResponse>(`/me/drafts/${encodeURIComponent(id)}/submission`, undefined, { signal }),

  /** GET /me/listing-quota */
  getListingQuota: (signal?: AbortSignal) => apiGet<ListingQuotaResponse>("/me/listing-quota", undefined, { signal }),

  /** GET /promotions — boost options with today's capped slots. */
  listPromotions: (signal?: AbortSignal) => apiGet<ListPromotionsResponse>("/promotions", undefined, { signal }),

  /** GET /places/projects?q= — project name autocomplete for the address step. */
  searchProjectPlaces: (q: string, signal?: AbortSignal) =>
    apiGet<SearchProjectPlacesResponse>("/places/projects", { q }, { signal }),

  /** GET /stations/nearby?lat=&lng= */
  listNearbyStations: (point: { lat: number; lng: number }, signal?: AbortSignal) =>
    apiGet<NearbyStationsResponse>("/stations/nearby", point, { signal }),
};

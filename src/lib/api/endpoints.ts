import type {
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
  getSession: (signal?: AbortSignal) => apiGet<SessionResponse>("/auth/me", undefined, { signal }),

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

import type {
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
import { apiGet, apiPost } from "./client";

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
};

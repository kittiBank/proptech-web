import type {
  ListAdsQuery,
  ListAdsResponse,
  ListCategoriesResponse,
  ListProjectsQuery,
  ListProjectsResponse,
  ListPropertiesQuery,
  ListPropertiesResponse,
  ListStationsResponse,
} from "@/types/api";
import { apiGet } from "./client";

/** One function per REST endpoint. Components use these through `queries.ts`, never directly. */
export const api = {
  /** GET /properties — paginated, filterable listings. */
  listProperties: (query: ListPropertiesQuery = {}, signal?: AbortSignal) =>
    apiGet<ListPropertiesResponse>("/properties", { ...query }, { signal }),

  /** GET /projects — developer projects. */
  listProjects: (query: ListProjectsQuery = {}, signal?: AbortSignal) =>
    apiGet<ListProjectsResponse>("/projects", { ...query }, { signal }),

  /** GET /stations — BTS/MRT stations grouped by line. */
  listStations: (signal?: AbortSignal) => apiGet<ListStationsResponse>("/stations", undefined, { signal }),

  /** GET /categories — property types with listing counts. */
  listCategories: (signal?: AbortSignal) => apiGet<ListCategoriesResponse>("/categories", undefined, { signal }),

  /** GET /ads — sponsored banners for one placement. */
  listAds: (query: ListAdsQuery, signal?: AbortSignal) => apiGet<ListAdsResponse>("/ads", { ...query }, { signal }),
};

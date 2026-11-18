import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { AdPlacement, ListProjectsQuery, ListPropertiesQuery } from "@/types/api";
import { ApiError } from "./client";
import { api } from "./endpoints";

const MINUTE = 60_000;

/**
 * Query keys and options in one place, so every component (and any future
 * server prefetch) shares the same cache identity for the same request.
 */
export const queryKeys = {
  properties: {
    all: ["properties"] as const,
    list: (query: ListPropertiesQuery) => ["properties", "list", query] as const,
    detail: (slug: string) => ["properties", "detail", slug] as const,
    nearby: (slug: string, limit: number) => ["properties", "nearby", slug, limit] as const,
  },
  projects: {
    all: ["projects"] as const,
    list: (query: ListProjectsQuery) => ["projects", "list", query] as const,
    detail: (slug: string) => ["projects", "detail", slug] as const,
    nearby: (slug: string, limit: number) => ["projects", "nearby", slug, limit] as const,
  },
  session: ["auth", "session"] as const,
  favorites: ["me", "favorites"] as const,
  compare: (ids: string[]) => ["compare", ids] as const,
  stations: ["stations"] as const,
  categories: ["categories"] as const,
  ads: (placement: AdPlacement) => ["ads", placement] as const,
};

export const propertyQueries = {
  list: (query: ListPropertiesQuery) =>
    queryOptions({
      queryKey: queryKeys.properties.list(query),
      queryFn: ({ signal }) => api.listProperties(query, signal),
      staleTime: MINUTE,
      // Keep the current page on screen while the next page or filter loads.
      placeholderData: keepPreviousData,
    }),
  detail: (slug: string) =>
    queryOptions({
      queryKey: queryKeys.properties.detail(slug),
      queryFn: ({ signal }) => api.getProperty(slug, signal),
      staleTime: MINUTE,
    }),
  nearby: (slug: string, limit: number) =>
    queryOptions({
      queryKey: queryKeys.properties.nearby(slug, limit),
      queryFn: ({ signal }) => api.listNearbyProperties(slug, { limit }, signal),
      staleTime: 5 * MINUTE,
    }),
};

export const projectQueries = {
  list: (query: ListProjectsQuery) =>
    queryOptions({
      queryKey: queryKeys.projects.list(query),
      queryFn: ({ signal }) => api.listProjects(query, signal),
      staleTime: 5 * MINUTE,
      placeholderData: keepPreviousData,
    }),
  detail: (slug: string) =>
    queryOptions({
      queryKey: queryKeys.projects.detail(slug),
      queryFn: ({ signal }) => api.getProject(slug, signal),
      staleTime: 5 * MINUTE,
    }),
  nearby: (slug: string, limit: number) =>
    queryOptions({
      queryKey: queryKeys.projects.nearby(slug, limit),
      queryFn: ({ signal }) => api.listNearbyProjects(slug, limit, signal),
      staleTime: 5 * MINUTE,
    }),
};

/** Reference data that rarely changes. */
export const stationsQuery = queryOptions({
  queryKey: queryKeys.stations,
  queryFn: ({ signal }) => api.listStations(signal),
  staleTime: 30 * MINUTE,
});

export const categoriesQuery = queryOptions({
  queryKey: queryKeys.categories,
  queryFn: ({ signal }) => api.listCategories(signal),
  staleTime: 10 * MINUTE,
});

export const adQueries = {
  placement: (placement: AdPlacement) =>
    queryOptions({
      queryKey: queryKeys.ads(placement),
      queryFn: ({ signal }) => api.listAds({ placement }, signal),
      staleTime: 5 * MINUTE,
      // A missing banner is not worth retrying for.
      retry: false,
    }),
};

/** The signed-in user's favorites. Mutations update this cache in place (see `useFavorites`). */
export const favoritesQuery = queryOptions({
  queryKey: queryKeys.favorites,
  queryFn: ({ signal }) => api.listFavorites(signal),
  staleTime: 5 * MINUTE,
});

export const compareQuery = (ids: string[]) =>
  queryOptions({
    queryKey: queryKeys.compare(ids),
    queryFn: ({ signal }) => api.compareListings(ids, signal),
    staleTime: MINUTE,
    enabled: ids.length > 0,
  });

/** The signed-in user, or `null` when signed out (a 401 is an answer, not an error). */
export const sessionQuery = queryOptions({
  queryKey: queryKeys.session,
  queryFn: async ({ signal }) => {
    try {
      return (await api.getSession(signal)).data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
  staleTime: 5 * MINUTE,
});

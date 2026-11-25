import { infiniteQueryOptions, keepPreviousData, queryOptions } from "@tanstack/react-query";
import type {
  AdPlacement,
  ListSellerListingsQuery,
  OverviewRange,
  ThreadFilter,
  NotificationKind,
  ListArticlesQuery,
  ListProjectsQuery,
  ListPropertiesQuery,
} from "@/types/api";
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
  agents: {
    detail: (slug: string) => ["agents", "detail", slug] as const,
  },
  articles: {
    all: ["articles"] as const,
    list: (query: ListArticlesQuery) => ["articles", "list", query] as const,
    feed: (query: Omit<ListArticlesQuery, "page">) => ["articles", "feed", query] as const,
    detail: (slug: string) => ["articles", "detail", slug] as const,
  },
  session: ["auth", "session"] as const,
  favorites: ["me", "favorites"] as const,
  drafts: {
    all: ["me", "drafts"] as const,
    detail: (id: string) => ["me", "drafts", id] as const,
    submission: (id: string) => ["me", "drafts", id, "submission"] as const,
  },
  listingQuota: ["me", "listing-quota"] as const,
  savedSearches: ["me", "saved-searches"] as const,
  unreadCounts: ["me", "unread-counts"] as const,
  profile: ["me", "profile"] as const,
  threads: {
    all: ["me", "threads"] as const,
    list: (filter: ThreadFilter) => ["me", "threads", "list", filter] as const,
    detail: (id: string) => ["me", "threads", "detail", id] as const,
    slots: (id: string) => ["me", "threads", "slots", id] as const,
  },
  appointments: ["me", "viewings"] as const,
  seller: {
    all: ["me", "seller"] as const,
    account: ["me", "seller", "account"] as const,
    overview: (days: OverviewRange) => ["me", "seller", "overview", days] as const,
    listings: (query: ListSellerListingsQuery) => ["me", "seller", "listings", query] as const,
    boostOptions: ["me", "seller", "boost-options"] as const,
    leads: ["me", "seller", "leads"] as const,
    availability: ["me", "seller", "availability"] as const,
  },
  notifications: {
    all: ["me", "notifications"] as const,
    list: (kind?: NotificationKind) => ["me", "notifications", kind ?? "all"] as const,
  },
  promotions: ["promotions"] as const,
  projectPlaces: (q: string) => ["places", "projects", q] as const,
  nearbyStations: (lat: number, lng: number) => ["stations", "nearby", lat, lng] as const,
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

export const agentQueries = {
  detail: (slug: string) =>
    queryOptions({
      queryKey: queryKeys.agents.detail(slug),
      queryFn: ({ signal }) => api.getAgent(slug, signal),
      staleTime: 5 * MINUTE,
    }),
};

export const articleQueries = {
  list: (query: ListArticlesQuery) =>
    queryOptions({
      queryKey: queryKeys.articles.list(query),
      queryFn: ({ signal }) => api.listArticles(query, signal),
      staleTime: 10 * MINUTE,
    }),
  /** "Load more" feed: each page is appended under the previous one. */
  feed: (query: Omit<ListArticlesQuery, "page">) =>
    infiniteQueryOptions({
      queryKey: queryKeys.articles.feed(query),
      queryFn: ({ signal, pageParam }) => api.listArticles({ ...query, page: pageParam }, signal),
      initialPageParam: 1,
      getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
      staleTime: 10 * MINUTE,
      placeholderData: keepPreviousData,
    }),
  detail: (slug: string) =>
    queryOptions({
      queryKey: queryKeys.articles.detail(slug),
      queryFn: ({ signal }) => api.getArticle(slug, signal),
      staleTime: 10 * MINUTE,
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

/** The signed-in user, or `null` when signed out. A 401 is also read as signed out, for older API builds. */
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

export const draftQueries = {
  list: queryOptions({
    queryKey: queryKeys.drafts.all,
    queryFn: ({ signal }) => api.listDrafts(signal),
  }),
  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.drafts.detail(id),
      queryFn: ({ signal }) => api.getDraft(id, signal),
      // The wizard owns the live copy; refetching would overwrite unsaved edits.
      staleTime: Infinity,
      // Store the editor's object as-is, so it can recognise its own writes (see `useDraftEditor`).
      structuralSharing: false,
      refetchOnMount: false,
    }),
  submission: (id: string) =>
    queryOptions({
      queryKey: queryKeys.drafts.submission(id),
      queryFn: ({ signal }) => api.getSubmission(id, signal),
    }),
};

export const savedSearchesQuery = queryOptions({
  queryKey: queryKeys.savedSearches,
  queryFn: ({ signal }) => api.listSavedSearches(signal),
});

/** Badge counts; refreshed every minute while the app is open. Only fetch when signed in. */
export const unreadCountsQuery = queryOptions({
  queryKey: queryKeys.unreadCounts,
  queryFn: async ({ signal }) => (await api.getUnreadCounts(signal)).data,
  staleTime: MINUTE,
  refetchInterval: MINUTE,
});

export const profileQuery = queryOptions({
  queryKey: queryKeys.profile,
  queryFn: async ({ signal }) => (await api.getProfile(signal)).data,
});

export const notificationsQuery = (kind?: NotificationKind) =>
  queryOptions({
    queryKey: queryKeys.notifications.list(kind),
    queryFn: ({ signal }) => api.listNotifications(kind, signal),
    placeholderData: keepPreviousData,
  });

/** Chats poll so replies show up without a reload (mock replies arrive a few seconds after sending). */
export const threadQueries = {
  list: (filter: ThreadFilter = "all") =>
    queryOptions({
      queryKey: queryKeys.threads.list(filter),
      queryFn: ({ signal }) => api.listThreads(filter, signal),
      refetchInterval: 15_000,
      placeholderData: keepPreviousData,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.threads.detail(id),
      queryFn: async ({ signal }) => (await api.getThread(id, signal)).data,
      refetchInterval: 5_000,
    }),
  slots: (id: string) =>
    queryOptions({
      queryKey: queryKeys.threads.slots(id),
      queryFn: async ({ signal }) => (await api.getViewingSlots(id, signal)).data,
      staleTime: MINUTE,
    }),
};

export const appointmentsQuery = queryOptions({
  queryKey: queryKeys.appointments,
  queryFn: ({ signal }) => api.listAppointments(signal),
  refetchInterval: 30_000,
});

/** Seller dashboard (C8–C14). Every key sits under `queryKeys.seller.all`, so one invalidation refreshes it all. */
export const sellerQueries = {
  account: queryOptions({
    queryKey: queryKeys.seller.account,
    queryFn: async ({ signal }) => (await api.getSellerAccount(signal)).data,
    staleTime: MINUTE,
  }),
  overview: (days: OverviewRange) =>
    queryOptions({
      queryKey: queryKeys.seller.overview(days),
      queryFn: async ({ signal }) => (await api.getSellerOverview(days, signal)).data,
      staleTime: MINUTE,
      placeholderData: keepPreviousData,
    }),
  listings: (query: ListSellerListingsQuery) =>
    queryOptions({
      queryKey: queryKeys.seller.listings(query),
      queryFn: ({ signal }) => api.listSellerListings(query, signal),
      placeholderData: keepPreviousData,
    }),
  boostOptions: queryOptions({
    queryKey: queryKeys.seller.boostOptions,
    queryFn: async ({ signal }) => (await api.listBoostOptions(signal)).data,
  }),
  leads: queryOptions({
    queryKey: queryKeys.seller.leads,
    queryFn: async ({ signal }) => (await api.listLeads(signal)).data,
    staleTime: MINUTE,
  }),
  availability: queryOptions({
    queryKey: queryKeys.seller.availability,
    queryFn: async ({ signal }) => (await api.getAvailability(signal)).data,
  }),
};

export const listingQuotaQuery = queryOptions({
  queryKey: queryKeys.listingQuota,
  queryFn: ({ signal }) => api.getListingQuota(signal),
});

export const promotionsQuery = queryOptions({
  queryKey: queryKeys.promotions,
  queryFn: ({ signal }) => api.listPromotions(signal),
  staleTime: 5 * MINUTE,
});

export const projectPlacesQuery = (q: string) =>
  queryOptions({
    queryKey: queryKeys.projectPlaces(q),
    queryFn: ({ signal }) => api.searchProjectPlaces(q, signal),
    enabled: q.trim().length >= 2,
    staleTime: 5 * MINUTE,
    placeholderData: keepPreviousData,
  });

/** Rounded to ~10 m so tiny pin drags reuse the cache. */
export const nearbyStationsQuery = (point: { lat: number; lng: number }) => {
  const lat = Math.round(point.lat * 10_000) / 10_000;
  const lng = Math.round(point.lng * 10_000) / 10_000;
  return queryOptions({
    queryKey: queryKeys.nearbyStations(lat, lng),
    queryFn: ({ signal }) => api.listNearbyStations({ lat, lng }, signal),
    staleTime: 30 * MINUTE,
    placeholderData: keepPreviousData,
  });
};

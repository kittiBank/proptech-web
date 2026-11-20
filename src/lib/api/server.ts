import { cache } from "react";
import type {
  AgentProfileDto,
  GetAgentResponse,
  ListPropertiesQuery,
  ListPropertiesResponse,
  ArticleDetailDto,
  GetArticleResponse,
  GetProjectResponse,
  GetPropertyResponse,
  ProjectDetailDto,
  PropertyDetailDto,
} from "@/types/api";

/**
 * Server-side reads for metadata, JSON-LD, the sitemap and the first render of
 * key pages (seeded into TanStack Query; later updates still load in the browser).
 *
 * - NEXT_PUBLIC_API_URL set   → fetch the NestJS API.
 * - NEXT_PUBLIC_API_URL unset → read the same in-memory data MSW serves, so
 *   titles and structured data match what the page shows.
 *
 * `cache` dedupes the read between `generateMetadata` and the page.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

async function fetchDetail<T>(path: string): Promise<T | undefined> {
  const res = await fetch(`${API_URL}${path}`, { headers: { Accept: "application/json" } });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`);
  return ((await res.json()) as { data: T }).data;
}

export const getPropertyForSeo = cache(async (slug: string): Promise<PropertyDetailDto | undefined> => {
  if (API_URL) return fetchDetail<GetPropertyResponse["data"]>(`/properties/${encodeURIComponent(slug)}`);
  return (await import("@/mocks/db")).getPropertyDetail(slug);
});

export const getProjectForSeo = cache(async (slug: string): Promise<ProjectDetailDto | undefined> => {
  if (API_URL) return fetchDetail<GetProjectResponse["data"]>(`/projects/${encodeURIComponent(slug)}`);
  return (await import("@/mocks/db")).getProjectDetail(slug);
});

export const getAgentForSeo = cache(async (slug: string): Promise<AgentProfileDto | undefined> => {
  if (API_URL) return fetchDetail<GetAgentResponse["data"]>(`/agents/${encodeURIComponent(slug)}`);
  return (await import("@/mocks/db")).getAgentProfile(slug);
});

export const getArticleForSeo = cache(async (slug: string): Promise<ArticleDetailDto | undefined> => {
  if (API_URL) return fetchDetail<GetArticleResponse["data"]>(`/articles/${encodeURIComponent(slug)}`);
  return (await import("@/mocks/articles")).getArticle(slug);
});

/** `GET /properties` for the first server render of a list (see `components/query/prefetched.tsx`). */
export const listPropertiesForSsr = cache(async (query: ListPropertiesQuery): Promise<ListPropertiesResponse> => {
  if (API_URL) {
    const params = new URLSearchParams(
      Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    );
    const res = await fetch(`${API_URL}/properties?${params}`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`GET /properties failed with ${res.status}`);
    return (await res.json()) as ListPropertiesResponse;
  }
  return (await import("@/mocks/db")).queryProperties(query);
});

interface SitemapEntry {
  slug: string;
  /** ISO date. */
  updatedAt?: string;
}

/** Every listing, project and article slug, for `sitemap.xml`. Mock data only until the API has a sitemap feed. */
export async function listSitemapSlugs(): Promise<{
  properties: SitemapEntry[];
  projects: SitemapEntry[];
  articles: SitemapEntry[];
  agents: SitemapEntry[];
}> {
  if (API_URL) return { properties: [], projects: [], articles: [], agents: [] };
  const [{ queryProperties, queryProjects, agentSlugs }, { articles }] = await Promise.all([
    import("@/mocks/db"),
    import("@/data/articles"),
  ]);
  const properties: SitemapEntry[] = [];
  for (let page = 1, totalPages = 1; page <= totalPages; page++) {
    const res = queryProperties({ page, limit: 100 });
    totalPages = res.meta.totalPages;
    properties.push(...res.data.map((p) => ({ slug: p.slug, updatedAt: p.postedAt })));
  }
  return {
    properties,
    projects: queryProjects({ limit: 50 }).data.map((p) => ({ slug: p.slug })),
    articles: articles.map((a) => ({ slug: a.slug, updatedAt: a.updatedAt })),
    agents: agentSlugs().map((slug) => ({ slug })),
  };
}

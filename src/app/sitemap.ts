import type { MetadataRoute } from "next";
import { legalDocs } from "@/data/legal";
import { routes } from "@/data/navigation";
import { listSitemapSlugs } from "@/lib/api/server";
import { absoluteUrl } from "@/lib/site";

/** Public pages plus every listing, project, article and agent profile. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { properties, projects, articles, agents } = await listSitemapSlugs();
  const page = (path: string, priority: number, lastModified?: string): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(path),
    priority,
    ...(lastModified && { lastModified }),
  });

  return [
    page(routes.home, 1),
    page("/search?mode=buy", 0.9),
    page("/search?mode=rent", 0.9),
    page(routes.newProjects, 0.8),
    page(routes.guides, 0.7),
    page(routes.mortgageTool, 0.6),
    page(routes.pricing, 0.6),
    page(routes.help, 0.5),
    ...legalDocs.map((d) => page(routes.legal(d.slug), 0.3)),
    ...properties.map((p) => page(routes.property(p.slug), 0.7, p.updatedAt)),
    ...projects.map((p) => page(routes.project(p.slug), 0.7, p.updatedAt)),
    ...articles.map((a) => page(routes.guide(a.slug), 0.6, a.updatedAt)),
    ...agents.map((a) => page(routes.agent(a.slug), 0.5)),
  ];
}

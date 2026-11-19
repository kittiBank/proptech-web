import { Suspense } from "react";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { ProjectDetailSkeleton, ProjectDetailView } from "@/components/project/project-detail-view";
import { routes } from "@/data/navigation";
import { getProjectForSeo } from "@/lib/api/server";
import { metaDescription } from "@/lib/site";
import { breadcrumbJsonLd, projectJsonLd } from "@/lib/structured-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getProjectForSeo(slug);
  if (!item) return { title: "ไม่พบโครงการ", robots: { index: false } };
  return {
    title: item.name,
    description: metaDescription(item.description),
    alternates: { canonical: routes.project(slug) },
    openGraph: {
      type: "website",
      url: routes.project(slug),
      title: item.name,
      description: metaDescription(item.description),
      images: [{ url: item.image.src, alt: item.image.alt }],
    },
  };
}

/** JSON-LD for search engines. Reads the slug, so it renders at request time inside its own Suspense. */
async function StructuredData({ params }: Props) {
  const { slug } = await params;
  const item = await getProjectForSeo(slug);
  if (!item) return null;
  return (
    <JsonLd
      data={[
        projectJsonLd(item),
        breadcrumbJsonLd([
          { name: "หน้าแรก", path: routes.home },
          { name: "โครงการใหม่", path: routes.newProjects },
          { name: item.name, path: routes.project(item.slug) },
        ]),
      ]}
    />
  );
}

/**
 * Project page. Like the listing page, the view reads the slug with
 * `useParams` and loads `GET /projects/:slug` through TanStack Query.
 * Metadata and JSON-LD are read on the server (`lib/api/server.ts`).
 */
export default function ProjectPage({ params }: Props) {
  return (
    <>
      <Suspense fallback={<ProjectDetailSkeleton />}>
        <ProjectDetailView />
      </Suspense>
      <Suspense>
        <StructuredData params={params} />
      </Suspense>
    </>
  );
}

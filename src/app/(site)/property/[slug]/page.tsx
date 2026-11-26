import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Prefetched } from "@/components/query/prefetched";
import { JsonLd } from "@/components/seo/json-ld";
import { PropertyDetailSkeleton } from "@/components/listing/property-detail-skeleton";
import { PropertyDetailView } from "@/components/listing/property-detail-view";
import { routes } from "@/data/navigation";
import { queryKeys } from "@/lib/api/queries";
import { getPropertyForSeo } from "@/lib/api/server";
import { closureCopy } from "@/lib/listing";
import { metaDescription } from "@/lib/site";
import { breadcrumbJsonLd, listingJsonLd } from "@/lib/structured-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPropertyForSeo(slug);
  if (!item) return { title: "ไม่พบประกาศ", robots: { index: false } };
  if (item.closed)
    return { title: `${closureCopy[item.closed.reason].title}: ${item.title}`, robots: { index: false } };
  return {
    title: item.title,
    description: metaDescription(item.description),
    alternates: { canonical: routes.property(slug) },
    openGraph: {
      type: "website",
      url: routes.property(slug),
      title: item.title,
      description: metaDescription(item.description),
      images: [{ url: item.image.src, alt: item.image.alt }],
    },
  };
}

/** JSON-LD for search engines. Reads the slug, so it renders at request time inside its own Suspense. */
async function StructuredData({ params }: Props) {
  const { slug } = await params;
  const item = await getPropertyForSeo(slug);
  if (!item || item.closed) return null;
  return (
    <JsonLd
      data={[
        listingJsonLd(item),
        breadcrumbJsonLd([
          { name: "หน้าแรก", path: routes.home },
          { name: item.mode === "rent" ? "เช่า" : "ซื้อ", path: routes.search({ mode: item.mode }) },
          { name: item.title, path: routes.property(item.slug) },
        ]),
      ]}
    />
  );
}

/** The view with the listing already in the query cache, so the photo and text are in the HTML. */
async function ServerRenderedListing({ params }: Props) {
  // Request-time only: the mock read is synchronous and seeding the cache stamps `Date.now()`,
  // which Cache Components rejects during prerendering (e.g. on client navigation).
  await connection();
  const { slug } = await params;
  const item = await getPropertyForSeo(slug);
  return (
    <Prefetched queries={[{ queryKey: queryKeys.properties.detail(slug), data: item && { data: item } }]}>
      <PropertyDetailView />
    </Prefetched>
  );
}

/**
 * Listing page. The view reads the slug with `useParams` inside Suspense and
 * loads `GET /properties/:slug` through TanStack Query (mocked by MSW until the
 * API exists). The first render, metadata and JSON-LD use a server read (`lib/api/server.ts`).
 */
export default function PropertyPage({ params }: Props) {
  return (
    <>
      <Suspense fallback={<PropertyDetailSkeleton />}>
        <ServerRenderedListing params={params} />
      </Suspense>
      <Suspense>
        <StructuredData params={params} />
      </Suspense>
    </>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { PropertyDetailSkeleton } from "@/components/listing/property-detail-skeleton";
import { PropertyDetailView } from "@/components/listing/property-detail-view";
import { routes } from "@/data/navigation";
import { getPropertyForSeo } from "@/lib/api/server";
import { metaDescription } from "@/lib/site";
import { breadcrumbJsonLd, listingJsonLd } from "@/lib/structured-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPropertyForSeo(slug);
  if (!item) return { title: "ไม่พบประกาศ", robots: { index: false } };
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
  if (!item) return null;
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

/**
 * Listing page. The view reads the slug with `useParams` inside Suspense and
 * loads `GET /properties/:slug` through TanStack Query (mocked by MSW until the
 * API exists). Metadata and JSON-LD are read on the server (`lib/api/server.ts`).
 */
export default function PropertyPage({ params }: Props) {
  return (
    <>
      <Suspense fallback={<PropertyDetailSkeleton />}>
        <PropertyDetailView />
      </Suspense>
      <Suspense>
        <StructuredData params={params} />
      </Suspense>
    </>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { ArticleSkeleton, ArticleView } from "@/components/guides/article-view";
import { routes } from "@/data/navigation";
import { getArticleForSeo } from "@/lib/api/server";
import { metaDescription } from "@/lib/site";
import { breadcrumbJsonLd, articleJsonLd } from "@/lib/structured-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getArticleForSeo(slug);
  if (!item) return { title: "ไม่พบบทความ", robots: { index: false } };
  return {
    title: item.title,
    description: metaDescription(item.excerpt),
    alternates: { canonical: routes.guide(slug) },
    openGraph: {
      type: "article",
      url: routes.guide(slug),
      title: item.title,
      description: metaDescription(item.excerpt),
      images: [{ url: item.cover.src, alt: item.cover.alt }],
      publishedTime: item.publishedAt,
      modifiedTime: item.updatedAt,
    },
  };
}

/** JSON-LD for search engines. Reads the slug, so it renders at request time inside its own Suspense. */
async function StructuredData({ params }: Props) {
  const { slug } = await params;
  const item = await getArticleForSeo(slug);
  if (!item) return null;
  return (
    <JsonLd
      data={[
        articleJsonLd(item),
        breadcrumbJsonLd([
          { name: "บทความ & คู่มือ", path: routes.guides },
          { name: item.title, path: routes.guide(item.slug) },
        ]),
      ]}
    />
  );
}

/**
 * Article page (D2, D12). The view reads the slug with `useParams` and loads
 * `GET /articles/:slug` through TanStack Query. Metadata and JSON-LD are read
 * on the server (`lib/api/server.ts`).
 */
export default function ArticlePage({ params }: Props) {
  return (
    <>
      <Suspense fallback={<ArticleSkeleton />}>
        <ArticleView />
      </Suspense>
      <Suspense>
        <StructuredData params={params} />
      </Suspense>
    </>
  );
}

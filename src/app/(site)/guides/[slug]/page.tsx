import { Suspense } from "react";
import type { Metadata } from "next";
import { ArticleSkeleton, ArticleView } from "@/components/guides/article-view";

export const metadata: Metadata = {
  title: "บทความ",
};

/**
 * Article page (D2, D12). Like the listing page, the view reads the slug with
 * `useParams` and loads `GET /articles/:slug` through TanStack Query.
 */
export default function ArticlePage() {
  return (
    <Suspense fallback={<ArticleSkeleton />}>
      <ArticleView />
    </Suspense>
  );
}

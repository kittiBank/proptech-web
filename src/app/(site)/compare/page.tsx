import { Suspense } from "react";
import type { Metadata } from "next";
import { Container } from "@/components/home/section-header";
import { CompareView } from "@/components/favorites/compare-view";
import { Skeleton } from "@/components/ui/query-state";

export const metadata: Metadata = {
  title: "เปรียบเทียบประกาศ",
  robots: { index: false },
};

/** Side-by-side table (B12, B13). Listing ids come from `?ids=`, read inside Suspense. */
export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <Container className="py-6">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="mt-6 h-[420px] w-full rounded-lg" />
        </Container>
      }
    >
      <CompareView />
    </Suspense>
  );
}

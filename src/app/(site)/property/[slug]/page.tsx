import { Suspense } from "react";
import type { Metadata } from "next";
import { PropertyDetailSkeleton } from "@/components/listing/property-detail-skeleton";
import { PropertyDetailView } from "@/components/listing/property-detail-view";

export const metadata: Metadata = {
  title: "ประกาศ",
};

/**
 * Listing page. The slug is only known at request time, so the view reads it
 * with `useParams` inside Suspense; the listing itself comes from
 * `GET /properties/:slug` through TanStack Query (mocked by MSW until the API exists).
 */
export default function PropertyPage() {
  return (
    <Suspense fallback={<PropertyDetailSkeleton />}>
      <PropertyDetailView />
    </Suspense>
  );
}

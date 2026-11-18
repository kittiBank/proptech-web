import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchSkeleton, SearchView } from "@/components/search/search-view";

export const metadata: Metadata = {
  title: "ค้นหาประกาศ",
  description: "ค้นหาบ้าน คอนโด ทาวน์โฮม ที่ดิน และอาคารพาณิชย์ในกรุงเทพฯ กรองตามราคา ขนาด ห้องนอน และสถานี BTS/MRT",
};

/**
 * Search results. Every filter lives in the query string, which the view
 * reads with `useSearchParams` inside Suspense so the page shell can still be
 * prerendered; results come from `GET /properties` through TanStack Query.
 */
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchView />
    </Suspense>
  );
}

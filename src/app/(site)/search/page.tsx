import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Prefetched } from "@/components/query/prefetched";
import { SearchSkeleton, SearchView } from "@/components/search/search-view";
import { queryKeys } from "@/lib/api/queries";
import { listPropertiesForSsr } from "@/lib/api/server";
import { parseSearchParams, toListQuery } from "@/lib/search-params";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The view with the first page of results already in the query cache (same key as `SearchView`). */
async function ServerRenderedSearch({ searchParams }: Props) {
  // Request-time only: the mock read is synchronous and seeding the cache stamps `Date.now()`,
  // which Cache Components rejects during prerendering (e.g. on client navigation).
  await connection();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, v);
  }
  const query = toListQuery(parseSearchParams(params));
  const data = await listPropertiesForSsr(query);
  return (
    <Prefetched queries={[{ queryKey: queryKeys.properties.list(query), data }]}>
      <SearchView />
    </Prefetched>
  );
}

export const metadata: Metadata = {
  title: "ค้นหาประกาศ",
  description: "ค้นหาบ้าน คอนโด ทาวน์โฮม ที่ดิน และอาคารพาณิชย์ในกรุงเทพฯ กรองตามราคา ขนาด ห้องนอน และสถานี BTS/MRT",
  alternates: { canonical: "/search" },
};

/**
 * Search results. Every filter lives in the query string, which the view
 * reads with `useSearchParams` inside Suspense so the page shell can still be
 * prerendered; the first page of results is read on the server and seeded into
 * TanStack Query, later pages come from `GET /properties` in the browser.
 */
export default function SearchPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <ServerRenderedSearch searchParams={searchParams} />
    </Suspense>
  );
}

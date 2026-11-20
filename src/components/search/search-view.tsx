"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, Map as MapIcon, SearchX, X } from "lucide-react";
import { Container } from "@/components/home/section-header";
import { PropertyCard } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { CardGridSkeleton, QueryError, Skeleton } from "@/components/ui/query-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { areaRanges, bedroomOptions, priceRanges, propertyTypeLabels } from "@/data/catalog";
import { propertyQueries } from "@/lib/api/queries";
import { formatNumber } from "@/lib/format";
import { findStation } from "@/lib/search";
import {
  clearSearchFilters,
  describeSearch,
  sortOptions,
  toListQuery,
  type SearchSort,
  type SearchState,
  type SearchView as View,
} from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { FilterPanel } from "./filter-panel";
import { FilterSheet } from "./filter-sheet";
import { NoResults } from "./no-results";
import { SearchBar } from "./search-bar";
import { useSearchState } from "./use-search-state";

// MapLibre is large and needs the browser; load it only for the map view.
const ResultsMap = dynamic(() => import("./results-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

const views: { value: View; label: string; icon: typeof LayoutGrid }[] = [
  { value: "list", label: "รายการ", icon: LayoutGrid },
  { value: "map", label: "แผนที่", icon: MapIcon },
];

/** One removable chip per active filter. */
function activeChips(state: SearchState): { key: string; label: string; clear: Partial<SearchState> }[] {
  const chips: { key: string; label: string; clear: Partial<SearchState> }[] = [];
  if (state.keyword) chips.push({ key: "q", label: `“${state.keyword}”`, clear: { keyword: "" } });
  if (state.type !== "all") chips.push({ key: "type", label: propertyTypeLabels[state.type], clear: { type: "all" } });
  for (const code of state.stations) {
    const station = findStation(code);
    chips.push({
      key: `station-${code}`,
      label: station ? `${station.system} ${station.name}` : code,
      clear: { stations: state.stations.filter((c) => c !== code) },
    });
  }
  const price = priceRanges[state.mode].find((r) => r.value === state.price);
  if (price && state.price !== "any") chips.push({ key: "price", label: price.label, clear: { price: "any" } });
  const beds = bedroomOptions.find((o) => o.value === state.bedrooms);
  if (beds && state.bedrooms !== "any")
    chips.push({ key: "beds", label: `${beds.label} ห้องนอน`, clear: { bedrooms: "any" } });
  const area = areaRanges.find((r) => r.value === state.area);
  if (area && state.area !== "any") chips.push({ key: "area", label: area.label, clear: { area: "any" } });
  return chips;
}

export function SearchView() {
  const { state, update, replace } = useSearchState();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isPending, isError, isFetching, isPlaceholderData, refetch } = useQuery(
    propertyQueries.list(toListQuery(state)),
  );

  const results = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = data?.meta.totalPages ?? 1;
  const firstIndex = data && total > 0 ? (data.meta.page - 1) * data.meta.limit + 1 : 0;
  const chips = activeChips(state);
  const hasFilters = chips.length > 0;
  const selected = results.find((p) => p.id === selectedId);

  const clearAll = () => update(clearSearchFilters(state));

  const goToPage = (page: number) => {
    setSelectedId(null);
    update({ page: Math.min(Math.max(1, page), pageCount) });
    resultsRef.current?.scrollIntoView({ block: "start" });
  };

  return (
    <Container className="py-8 sm:py-10">
      <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.015em] text-ink sm:text-[32px]">
        {describeSearch(state)}
      </h1>
      <p className="mt-1.5 min-h-6 text-[16px] text-slate" aria-live="polite">
        {data ? (
          <>
            พบ <span className="font-medium text-ink tabular-nums">{formatNumber(total)}</span> ประกาศ
          </>
        ) : isError ? null : (
          "กำลังค้นหา…"
        )}
      </p>

      <div className="mt-6">
        <SearchBar state={state} onChange={update} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside aria-label="ตัวกรอง" className="hidden lg:block">
          <div className="sticky top-[88px] max-h-[calc(100dvh-104px)] overflow-y-auto pr-2">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">ตัวกรอง</h2>
              <Button variant="link" size="sm" onClick={clearAll} disabled={!hasFilters}>
                ล้างทั้งหมด
              </Button>
            </div>
            <FilterPanel idPrefix="side" state={state} onChange={update} />
          </div>
        </aside>

        <div ref={resultsRef} className="min-w-0 scroll-mt-[88px]">
          {/* Keeps the outline h1 → h2 → card h3 on phones, where the filter aside (and its h2) is hidden. */}
          <h2 className="sr-only">ผลการค้นหา</h2>
          <div className="flex items-center gap-2">
            <FilterSheet state={state} onApply={replace} />

            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <Select value={state.sort} onValueChange={(v) => update({ sort: v as SearchSort })}>
                <SelectTrigger
                  aria-label="เรียงตาม"
                  className="h-11 w-auto min-w-0 rounded-md border border-line-strong bg-white px-3 hover:border-ink sm:min-w-[168px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {sortOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div role="group" aria-label="มุมมอง" className="flex gap-1 rounded-md bg-mist p-1">
                {views.map(({ value, label, icon: Icon }) => {
                  const active = state.view === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => update({ view: value })}
                      className={cn(
                        "inline-flex h-9 items-center gap-1.5 rounded-sm px-3 text-sm font-medium text-slate transition-colors hover:text-ink",
                        active && "bg-white text-ink ring-1 ring-line-strong",
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      <span className="sr-only sm:not-sr-only">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {hasFilters && (
            <ul aria-label="ตัวกรองที่ใช้อยู่" className="mt-4 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li key={chip.key}>
                  <button
                    type="button"
                    onClick={() => update(chip.clear)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft pr-2 pl-3 text-sm text-brand-strong transition-colors hover:border-brand"
                    aria-label={`เอาตัวกรอง ${chip.label} ออก`}
                  >
                    {chip.label}
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {total > 0 && state.view === "list" && (
            <p className="mt-4 text-sm text-slate tabular-nums">
              แสดง {formatNumber(firstIndex)}–{formatNumber(firstIndex + results.length - 1)} จาก {formatNumber(total)}
            </p>
          )}

          {isPending ? (
            <CardGridSkeleton
              count={6}
              columns={3}
              label="กำลังโหลดผลการค้นหา"
              className="mt-6 lg:grid-cols-2 xl:grid-cols-3"
            />
          ) : isError ? (
            <QueryError what="ผลการค้นหา" onRetry={() => refetch()} retrying={isFetching} className="mt-6" />
          ) : results.length === 0 ? (
            total > 0 ? (
              <PageOutOfRange onFirstPage={() => goToPage(1)} />
            ) : (
              <NoResults state={state} onClear={clearAll} />
            )
          ) : state.view === "map" ? (
            <div
              aria-busy={isPlaceholderData}
              className="relative mt-6 h-[min(72dvh,640px)] min-h-[420px] overflow-hidden rounded-lg border border-line"
            >
              <ResultsMap properties={results} selectedId={selectedId} onSelect={setSelectedId} />
              {selected ? (
                <div className="absolute inset-x-3 bottom-3 sm:right-auto sm:w-[340px]">
                  <PropertyCard property={selected} sizes="340px" className="shadow-lg" />
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="absolute -top-3 -right-3 z-10 inline-flex size-9 items-center justify-center rounded-full border border-line bg-white text-ink shadow hover:bg-mist"
                    aria-label="ปิดรายละเอียดประกาศ"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/95 px-3 py-2 text-sm text-slate shadow">
                  แสดง {formatNumber(results.length)} ประกาศในหน้านี้ แตะราคาเพื่อดูรายละเอียด
                </p>
              )}
            </div>
          ) : (
            <ul
              aria-busy={isPlaceholderData}
              className={cn(
                "mt-6 grid gap-6 transition-opacity sm:grid-cols-2 xl:grid-cols-3",
                isPlaceholderData && "opacity-60",
              )}
            >
              {results.map((p, i) => (
                <li key={p.id} className="flex">
                  <PropertyCard
                    property={p}
                    priority={i < 3}
                    sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw"
                    className="w-full"
                  />
                </li>
              ))}
            </ul>
          )}

          {data && results.length > 0 && (
            <Pagination
              page={data.meta.page}
              pageCount={pageCount}
              onPageChange={goToPage}
              className="mt-12"
              label="หน้าผลการค้นหา"
            />
          )}
        </div>
      </div>
    </Container>
  );
}

/** A page number past the last page (old link or a shrinking result set). */
function PageOutOfRange({ onFirstPage }: { onFirstPage: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-start gap-4 rounded-lg border border-dashed border-line-strong p-8 sm:p-10">
      <SearchX className="size-8 text-brand" aria-hidden="true" />
      <p className="text-lg font-semibold text-ink">หน้านี้ไม่มีประกาศแล้ว</p>
      <Button variant="outline" onClick={onFirstPage}>
        กลับไปหน้าแรกของผลการค้นหา
      </Button>
    </div>
  );
}

/** Suspense fallback while the URL is read on the client. */
export function SearchSkeleton() {
  return (
    <Container className="py-8 sm:py-10">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-5 w-32" />
      <Skeleton className="mt-6 h-11 w-full" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Skeleton className="hidden h-[480px] lg:block" />
        <CardGridSkeleton count={6} columns={3} label="กำลังโหลดหน้าค้นหา" className="lg:grid-cols-2 xl:grid-cols-3" />
      </div>
    </Container>
  );
}

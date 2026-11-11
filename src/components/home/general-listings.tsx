"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchX } from "lucide-react";
import { PropertyCard } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { CardGridSkeleton, QueryError } from "@/components/ui/query-state";
import { propertyTypeLabels } from "@/data/catalog";
import { propertyQueries } from "@/lib/api/queries";
import { formatNumber } from "@/lib/format";
import { describeFilters, toPropertyQuery } from "@/lib/search";
import { cn } from "@/lib/utils";
import { useRequiredHomeSearch } from "@/providers/home-search-provider";
import type { PropertyType } from "@/types/property";
import { AdCarousel } from "./ad-carousel";
import { Container, SectionHeader } from "./section-header";

/** 8 rows of the 3-column desktop grid per page. */
const COLUMNS = 3;
const ROWS_PER_PAGE = 8;
const PAGE_SIZE = COLUMNS * ROWS_PER_PAGE;
/** The sponsored slot sits after this many cards: mid-page, and a whole number of rows at 1, 2 and 3 columns. */
const AD_AFTER = PAGE_SIZE / 2;

const typeFilters: ("all" | PropertyType)[] = ["all", "condo", "house", "townhouse", "land", "commercial"];

export function GeneralListings() {
  const { applied, reset } = useRequiredHomeSearch();
  const [typeFilter, setTypeFilter] = useState<"all" | PropertyType>("all");
  const [pageState, setPageState] = useState({ page: 1, key: "" });

  // Any change to the search or type filter starts again from page 1.
  const resultKey = `${JSON.stringify(applied)}|${typeFilter}`;
  const page = pageState.key === resultKey ? pageState.page : 1;

  // Filtering, sorting and paging happen on the server; pinned placements have their own section.
  const { data, isPending, isError, isFetching, isPlaceholderData, refetch } = useQuery(
    propertyQueries.list({
      ...toPropertyQuery(applied, { type: typeFilter }),
      pinned: false,
      sort: "-postedAt",
      page,
      limit: PAGE_SIZE,
    }),
  );

  const shown = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = data?.meta.totalPages ?? 1;
  // From the response, so the range stays right while the next page is still loading.
  const firstIndex = data && total > 0 ? (data.meta.page - 1) * data.meta.limit + 1 : 0;

  const goToPage = (next: number) => {
    setPageState({ page: Math.min(Math.max(1, next), pageCount), key: resultKey });
    document.getElementById("listings")?.scrollIntoView({ block: "start" });
  };

  const clearAll = () => {
    reset();
    setTypeFilter("all");
  };

  return (
    <section id="listings" aria-labelledby="listings-title" className="border-t border-line py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionHeader
          id="listings-title"
          title={applied ? "ผลการค้นหา" : "ประกาศล่าสุดที่คุณอาจสนใจ"}
          description={
            applied ? (
              <>
                {describeFilters(applied)}
                {data && (
                  <>
                    {" "}
                    พบ <span className="font-medium text-ink tabular-nums">{formatNumber(total)}</span> รายการ
                  </>
                )}
              </>
            ) : (
              "ประกาศล่าสุดจากเจ้าของและนายหน้าทั่วกรุงเทพฯ เรียงจากใหม่ไปเก่า"
            )
          }
        >
          {applied && (
            <Button variant="outline" onClick={clearAll} className="self-start md:self-auto">
              ล้างการค้นหา
            </Button>
          )}
        </SectionHeader>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div role="group" aria-label="กรองตามประเภท" className="flex w-max gap-2">
              {typeFilters.map((t) => {
                const active = t === typeFilter;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTypeFilter(t)}
                    className={cn(
                      "h-10 rounded-md border px-4 text-[15px] transition-colors",
                      active
                        ? "border-brand bg-brand-soft font-medium text-brand-strong"
                        : "border-line-strong text-ink hover:border-ink",
                    )}
                  >
                    {t === "all" ? "ทั้งหมด" : propertyTypeLabels[t]}
                  </button>
                );
              })}
            </div>
          </div>
          {total > 0 && (
            <p className="text-sm text-slate tabular-nums" aria-live="polite">
              แสดง {formatNumber(firstIndex)}–{formatNumber(firstIndex + shown.length - 1)} จาก {formatNumber(total)}{" "}
              ประกาศ
            </p>
          )}
        </div>

        {isPending ? (
          <CardGridSkeleton count={COLUMNS * 2} columns={3} label="กำลังโหลดประกาศ" className="mt-8" />
        ) : isError ? (
          <QueryError what="ประกาศ" onRetry={() => refetch()} retrying={isFetching} className="mt-8" />
        ) : shown.length > 0 ? (
          <ul
            aria-busy={isPlaceholderData}
            className={cn(
              "mt-8 grid gap-6 transition-opacity sm:grid-cols-2 lg:grid-cols-3",
              isPlaceholderData && "opacity-60",
            )}
          >
            {shown.map((p, i) => (
              <Fragment key={p.id}>
                {i === AD_AFTER && (
                  <li className="col-span-full my-2">
                    <AdCarousel placement="home-feed" />
                  </li>
                )}
                <li className="flex">
                  <PropertyCard property={p} className="w-full" />
                </li>
              </Fragment>
            ))}
          </ul>
        ) : (
          <div className="mt-8 flex flex-col items-start gap-4 rounded-lg border border-dashed border-line-strong p-8 sm:p-10">
            <SearchX className="size-8 text-brand" aria-hidden="true" />
            <div>
              <p className="text-lg font-semibold text-ink">ไม่พบประกาศที่ตรงกับเงื่อนไข</p>
              <p className="mt-1 text-[15px] text-slate">ลองขยายช่วงราคา เปลี่ยนประเภท หรือเลือกสถานีใกล้เคียง</p>
            </div>
            <Button variant="outline" onClick={clearAll}>
              ดูประกาศทั้งหมด
            </Button>
          </div>
        )}

        {data && (
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={goToPage}
            className="mt-14"
            label="หน้าของประกาศล่าสุด"
          />
        )}
      </Container>
    </section>
  );
}

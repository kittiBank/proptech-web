"use client";

import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { PropertyCard } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { propertyTypeLabels } from "@/data/catalog";
import { formatNumber } from "@/lib/format";
import { describeFilters, filterProperties } from "@/lib/search";
import { cn } from "@/lib/utils";
import { useRequiredHomeSearch } from "@/providers/home-search-provider";
import type { Property, PropertyType } from "@/types/property";
import { Container, SectionHeader } from "./section-header";

/** 10 rows of the 4-column desktop grid per page. */
const COLUMNS = 4;
const ROWS_PER_PAGE = 10;
const PAGE_SIZE = COLUMNS * ROWS_PER_PAGE;

const typeFilters: ("all" | PropertyType)[] = ["all", "condo", "house", "townhouse", "land", "commercial"];

export function GeneralListings({ properties }: { properties: Property[] }) {
  const { applied, reset } = useRequiredHomeSearch();
  const [typeFilter, setTypeFilter] = useState<"all" | PropertyType>("all");
  const [pageState, setPageState] = useState({ page: 1, key: "" });

  const results = useMemo(() => {
    const base = applied ? filterProperties(properties, applied) : properties;
    return typeFilter === "all" ? base : base.filter((p) => p.type === typeFilter);
  }, [properties, applied, typeFilter]);

  // Any change to the search or type filter starts again from page 1.
  const resultKey = `${JSON.stringify(applied)}|${typeFilter}`;
  const page = pageState.key === resultKey ? pageState.page : 1;
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const shown = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstIndex = results.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

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
                {describeFilters(applied)} พบ{" "}
                <span className="font-medium text-ink tabular-nums">{formatNumber(results.length)}</span> รายการ
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
          {results.length > 0 && (
            <p className="text-sm text-slate tabular-nums" aria-live="polite">
              แสดง {formatNumber(firstIndex)}–{formatNumber(firstIndex + shown.length - 1)} จาก{" "}
              {formatNumber(results.length)} ประกาศ
            </p>
          )}
        </div>

        {shown.length > 0 ? (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((p) => (
              <li key={p.id} className="flex">
                <PropertyCard property={p} className="w-full" />
              </li>
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

        <Pagination
          page={page}
          pageCount={pageCount}
          onPageChange={goToPage}
          className="mt-14"
          label="หน้าของประกาศล่าสุด"
        />
      </Container>
    </section>
  );
}

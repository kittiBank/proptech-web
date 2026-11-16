"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { propertyQueries } from "@/lib/api/queries";
import { formatNumber } from "@/lib/format";
import {
  clearSearchFilters,
  countActiveFilters,
  toListQuery,
  updateSearchState,
  type SearchState,
} from "@/lib/search-params";
import { FilterPanel } from "./filter-panel";

/**
 * Mobile and tablet filters. Changes are a draft until "show results", and
 * the button previews how many listings the draft would return.
 */
export function FilterSheet({ state, onApply }: { state: SearchState; onApply: (next: SearchState) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(state);
  const active = countActiveFilters(state);

  // Only the total is needed; limit 1 keeps the preview request small.
  const { data: preview, isFetching } = useQuery({
    ...propertyQueries.list({ ...toListQuery(draft), page: 1, limit: 1 }),
    enabled: open,
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(state);
        setOpen(next);
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <SlidersHorizontal aria-hidden="true" />
          ตัวกรอง
          {active > 0 && (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-brand text-xs text-white tabular-nums">
              {active}
              <span className="sr-only"> รายการที่เลือก</span>
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent closeLabel="ปิดตัวกรอง" className="w-full max-w-md">
        <div className="border-b border-line px-5 py-4 pr-16">
          <SheetTitle className="text-lg font-semibold text-ink">ตัวกรอง</SheetTitle>
          <SheetDescription className="sr-only">เลือกเงื่อนไขแล้วกดดูผลลัพธ์</SheetDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <FilterPanel
            idPrefix="sheet"
            state={draft}
            onChange={(change) => setDraft((d) => updateSearchState(d, change))}
          />
        </div>
        <div className="flex items-center gap-3 border-t border-line px-5 py-4">
          <Button variant="ghost" onClick={() => setDraft(clearSearchFilters(draft))}>
            ล้างทั้งหมด
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onApply(draft);
              setOpen(false);
            }}
          >
            {preview && !isFetching ? `ดู ${formatNumber(preview.meta.total)} รายการ` : "ดูผลลัพธ์"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

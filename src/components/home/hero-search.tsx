"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { House, KeyRound, MapPin, Search, X } from "lucide-react";
import { PriceOptions, priceLabel, StationOptions, TypeOptions } from "@/components/search/search-options";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup } from "radix-ui";
import { popularSearches } from "@/data/catalog";
import { categoriesQuery } from "@/lib/api/queries";
import { formatNumber } from "@/lib/format";
import { hasActiveFilters, toSearchParams } from "@/lib/search";
import { useRequiredHomeSearch } from "@/providers/home-search-provider";
import type { ListingMode, PropertyCategory, PropertyType } from "@/types/property";

const fieldClass =
  "flex min-w-0 flex-col justify-center gap-1 border-b border-line px-4 py-3 sm:px-5 lg:border-b-0 lg:border-r lg:py-4 md:odd:border-r";

/** Segmented Buy/Rent toggle inside the panel; the selected option is a white chip on the mist track. */
const toggleClass =
  "inline-flex h-9 min-w-[96px] items-center justify-center gap-1.5 rounded-sm px-4 text-[15px] font-medium text-slate transition-colors after:hidden hover:text-ink data-[state=on]:bg-white data-[state=on]:text-ink data-[state=on]:ring-1 data-[state=on]:ring-line-strong data-[state=on]:[&_svg]:text-brand";

/** Sale/rent split of the category totals; replaced by API facets later. */
function toListingTotals(categories: PropertyCategory[]): Record<ListingMode, number> {
  const total = categories.reduce((sum, c) => sum + c.listingCount, 0);
  return { buy: Math.round(total * 0.63), rent: Math.round(total * 0.37) };
}

export function HeroSearch() {
  const { draft, setDraft, submit, clearFilters } = useRequiredHomeSearch();
  const canClear = hasActiveFilters(draft);
  // The listing count is hidden until categories arrive; the form works without it.
  const { data: listingTotals } = useQuery({ ...categoriesQuery, select: (res) => toListingTotals(res.data) });

  return (
    <div id="search" className="w-full">
      <form
        role="search"
        aria-label="ค้นหาอสังหาริมทรัพย์"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="rounded-lg bg-white"
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-3 py-2.5 sm:px-4">
          {/* A filter switch, not tabs: there are no tab panels, so it is a radio group (arrow keys move between). */}
          <ToggleGroup.Root
            type="single"
            value={draft.mode}
            // Ignore the "deselect" that a single toggle group sends when the active item is pressed again.
            onValueChange={(v) => v && setDraft({ mode: v as ListingMode })}
            aria-label="ต้องการซื้อหรือเช่า"
            className="grid min-w-0 flex-1 grid-cols-2 items-center gap-1 rounded-md bg-mist p-1 sm:inline-flex sm:flex-none"
          >
            <ToggleGroup.Item value="buy" className={toggleClass}>
              <House aria-hidden="true" className="size-4" />
              ซื้อ
            </ToggleGroup.Item>
            <ToggleGroup.Item value="rent" className={toggleClass}>
              <KeyRound aria-hidden="true" className="size-4" />
              เช่า
            </ToggleGroup.Item>
          </ToggleGroup.Root>
          <div className="flex items-center gap-4">
            {listingTotals && (
              <p className="hidden text-sm text-slate md:block" aria-live="polite">
                {draft.mode === "buy" ? "ประกาศขาย" : "ประกาศเช่า"}{" "}
                <span className="font-medium text-ink tabular-nums">{formatNumber(listingTotals[draft.mode])}</span>{" "}
                รายการ
              </p>
            )}
            {/* Always rendered so the row does not shift; disabled while there is nothing to clear. */}
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters} disabled={!canClear}>
              <X aria-hidden="true" />
              ล้างตัวกรอง
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 md:items-stretch lg:grid-cols-[1.35fr_1.25fr_1fr_1fr_auto]">
          <label className={fieldClass}>
            <span className="text-[13px] font-medium text-slate">ทำเล เขต หรือชื่อโครงการ</span>
            <span className="flex items-center gap-2">
              <MapPin className="size-[18px] shrink-0 text-brand" aria-hidden="true" />
              <input
                id="search-keyword"
                type="text"
                value={draft.keyword}
                onChange={(e) => setDraft({ keyword: e.target.value })}
                placeholder="เช่น วัฒนา, สาทร, ริเวอร์ไลน์"
                className="h-9 w-full min-w-0 bg-transparent text-[16px] text-ink outline-none placeholder:text-slate/80"
                autoComplete="off"
              />
            </span>
          </label>

          <div className={fieldClass}>
            <span id="station-label" className="text-[13px] font-medium text-slate">
              ใกล้รถไฟฟ้า
            </span>
            <Select value={draft.station} onValueChange={(v) => setDraft({ station: v })}>
              <SelectTrigger aria-labelledby="station-label" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <StationOptions />
              </SelectContent>
            </Select>
          </div>

          <div className={fieldClass}>
            <span id="type-label" className="text-[13px] font-medium text-slate">
              ประเภท
            </span>
            <Select value={draft.type} onValueChange={(v) => setDraft({ type: v as PropertyType | "all" })}>
              <SelectTrigger aria-labelledby="type-label" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <TypeOptions />
              </SelectContent>
            </Select>
          </div>

          <div className={fieldClass}>
            <span id="price-label" className="text-[13px] font-medium text-slate">
              {priceLabel(draft.mode)}
            </span>
            <Select value={draft.priceRange} onValueChange={(v) => setDraft({ priceRange: v })}>
              <SelectTrigger aria-labelledby="price-label" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <PriceOptions mode={draft.mode} />
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center p-3 md:col-span-2 lg:col-span-1 lg:px-3 lg:py-0">
            <Button type="submit" size="lg" className="h-12 w-full lg:h-12 lg:w-auto lg:px-6">
              <Search aria-hidden="true" />
              ค้นหา
            </Button>
          </div>
        </div>
      </form>

      {/* Own `hero` backing: the hero video shows through a light tint, so small text needs it for AA. */}
      <div className="mx-auto mt-5 flex w-fit max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-xl bg-hero/60 px-4 py-2.5 text-sm">
        <span className="text-white/80">ค้นหาบ่อย</span>
        {popularSearches.map((s) => (
          <Link
            key={s.label}
            href={`/search?${toSearchParams({
              mode: s.mode,
              keyword: s.keyword ?? "",
              station: s.station ?? "any",
              type: s.type ?? "all",
              priceRange: "any",
            }).toString()}`}
            className="text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
          >
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

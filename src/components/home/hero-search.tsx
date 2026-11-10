"use client";

import Link from "next/link";
import { House, KeyRound, MapPin, Search, TrainFront } from "lucide-react";
import { lineColor } from "@/components/property/transit-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { popularSearches, priceRanges, propertyTypeLabels } from "@/data/catalog";
import { formatNumber } from "@/lib/format";
import { useRequiredHomeSearch } from "@/providers/home-search-provider";
import { cn } from "@/lib/utils";
import type { ListingMode, PropertyType, TransitLine } from "@/types/property";

interface HeroSearchProps {
  listingTotals: Record<ListingMode, number>;
  lines: TransitLine[];
}

const fieldClass =
  "flex min-w-0 flex-col justify-center gap-1 border-b border-line px-4 py-3 sm:px-5 lg:border-b-0 lg:border-r lg:py-4 md:odd:border-r";

/** Segmented Buy/Rent toggle inside the panel; the selected option is a white chip on the mist track. */
const toggleClass =
  "inline-flex h-9 min-w-[96px] items-center justify-center gap-1.5 rounded-sm px-4 text-[15px] font-medium text-slate transition-colors after:hidden hover:text-ink data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:ring-1 data-[state=active]:ring-line-strong data-[state=active]:[&_svg]:text-brand";

const typeOptions = Object.entries(propertyTypeLabels) as [PropertyType, string][];

export function HeroSearch({ listingTotals, lines }: HeroSearchProps) {
  const { draft, setDraft, submit } = useRequiredHomeSearch();

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
        <Tabs value={draft.mode} onValueChange={(v) => setDraft({ mode: v as ListingMode })}>
          <div className="flex items-center justify-between gap-4 border-b border-line px-3 py-2.5 sm:px-4">
            <TabsList
              aria-label="ต้องการซื้อหรือเช่า"
              className="grid w-full grid-cols-2 items-center gap-1 rounded-md bg-mist p-1 sm:inline-flex sm:w-auto"
            >
              <TabsTrigger value="buy" className={toggleClass}>
                <House aria-hidden="true" className="size-4" />
                ซื้อ
              </TabsTrigger>
              <TabsTrigger value="rent" className={toggleClass}>
                <KeyRound aria-hidden="true" className="size-4" />
                เช่า
              </TabsTrigger>
            </TabsList>
            <p className="hidden text-sm text-slate sm:block" aria-live="polite">
              {draft.mode === "buy" ? "ประกาศขาย" : "ประกาศเช่า"}{" "}
              <span className="font-medium text-ink tabular-nums">{formatNumber(listingTotals[draft.mode])}</span> รายการ
            </p>
          </div>
        </Tabs>

        <div className="grid md:grid-cols-2 lg:grid-cols-[1.35fr_1.25fr_1fr_1fr_auto] md:items-stretch">
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
                <SelectItem value="any">
                  <span className="inline-flex items-center gap-2">
                    <TrainFront className="size-4 text-brand" aria-hidden="true" />
                    ทุกสถานี
                  </span>
                </SelectItem>
                {lines.map((line) => (
                  <SelectGroup key={line.id}>
                    <SelectSeparator />
                    <SelectLabel>
                      <span className={cn("h-1 w-4 rounded-full", lineColor[line.id])} aria-hidden="true" />
                      {line.name}
                    </SelectLabel>
                    {line.stations.map((st) => (
                      <SelectItem key={st.stationCode} value={st.stationCode}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex h-5 min-w-9 items-center justify-center rounded-sm px-1 text-[11px] font-semibold text-white tabular-nums",
                              lineColor[line.id],
                            )}
                          >
                            {st.stationCode}
                          </span>
                          {st.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
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
                <SelectItem value="all">ทุกประเภท</SelectItem>
                {typeOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={fieldClass}>
            <span id="price-label" className="text-[13px] font-medium text-slate">
              {draft.mode === "buy" ? "ราคาขาย" : "ค่าเช่าต่อเดือน"}
            </span>
            <Select value={draft.priceRange} onValueChange={(v) => setDraft({ priceRange: v })}>
              <SelectTrigger aria-labelledby="price-label" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priceRanges[draft.mode].map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
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

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
        <span className="text-white/70">ค้นหาบ่อย</span>
        {popularSearches.map((s) => (
          <Link
            key={s.label}
            href="/#listings"
            onClick={(e) => {
              e.preventDefault();
              submit({ mode: s.mode, keyword: s.keyword ?? "", station: s.station ?? "any", type: s.type ?? "all", priceRange: "any" });
            }}
            className="text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
          >
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

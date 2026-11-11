"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { PriceOptions, priceLabel, StationOptions, TypeOptions } from "@/components/search/search-options";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hasActiveFilters } from "@/lib/search";
import { cn } from "@/lib/utils";
import { useHomeSearch } from "@/providers/home-search-provider";
import type { ListingMode, PropertyType } from "@/types/property";

/** Height of the main header row; the hero form counts as "out of view" once it slides under it. */
const HEADER_HEIGHT = 68;

const fieldBox = "h-10 rounded-md border border-line-strong bg-white px-3 transition-colors hover:border-ink";

const modes: { value: ListingMode; label: string }[] = [
  { value: "buy", label: "ซื้อ" },
  { value: "rent", label: "เช่า" },
];

/**
 * Compact copy of the hero search that drops down under the header once the
 * hero form has scrolled away, so visitors can refine a search from anywhere
 * on the homepage. It edits the same draft filters as the hero form.
 */
export function HeaderSearch() {
  const search = useHomeSearch();
  const onHomepage = usePathname() === "/";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!onHomepage) return;
    const hero = document.getElementById("search");
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < HEADER_HEIGHT),
      { rootMargin: `-${HEADER_HEIGHT}px 0px 0px 0px` },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [onHomepage]);

  if (!search || !onHomepage) return null;
  const { draft, setDraft, submit, applied, clearFilters } = search;
  const canClear = hasActiveFilters(draft) || applied !== null;

  return (
    <div
      inert={!visible}
      aria-hidden={!visible}
      className={cn(
        "absolute inset-x-0 top-full border-b border-line bg-white shadow-[0_8px_16px_-12px_rgb(26_22_48/0.25)] transition-[opacity,translate] duration-200",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
      )}
    >
      <form
        role="search"
        aria-label="ค้นหาอสังหาริมทรัพย์ (แถบด่วน)"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mx-auto flex max-w-[1280px] items-center gap-2 px-4 py-2.5 sm:px-6 lg:px-8"
      >
        <div role="group" aria-label="ต้องการซื้อหรือเช่า" className="flex shrink-0 gap-1 rounded-md bg-mist p-1">
          {modes.map((m) => (
            <button
              key={m.value}
              type="button"
              aria-pressed={draft.mode === m.value}
              onClick={() => setDraft({ mode: m.value })}
              className={cn(
                "h-8 rounded-sm px-3 text-sm font-medium text-slate transition-colors hover:text-ink",
                draft.mode === m.value && "bg-white text-ink ring-1 ring-line-strong",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <label className={cn(fieldBox, "flex min-w-0 flex-1 items-center gap-2 focus-within:border-brand")}>
          <Search className="size-4 shrink-0 text-slate" aria-hidden="true" />
          <span className="sr-only">ทำเล เขต หรือชื่อโครงการ</span>
          <input
            type="text"
            value={draft.keyword}
            onChange={(e) => setDraft({ keyword: e.target.value })}
            placeholder="ทำเล เขต หรือโครงการ"
            className="h-full w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-slate/80"
            autoComplete="off"
          />
        </label>

        <Select value={draft.type} onValueChange={(v) => setDraft({ type: v as PropertyType | "all" })}>
          <SelectTrigger aria-label="ประเภท" className={cn(fieldBox, "hidden w-[140px] md:flex")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <TypeOptions />
          </SelectContent>
        </Select>

        <Select value={draft.station} onValueChange={(v) => setDraft({ station: v })}>
          <SelectTrigger aria-label="ใกล้รถไฟฟ้า" className={cn(fieldBox, "hidden w-[170px] lg:flex")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <StationOptions />
          </SelectContent>
        </Select>

        <Select value={draft.priceRange} onValueChange={(v) => setDraft({ priceRange: v })}>
          <SelectTrigger aria-label={priceLabel(draft.mode)} className={cn(fieldBox, "hidden w-[180px] lg:flex")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <PriceOptions mode={draft.mode} />
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={clearFilters}
          disabled={!canClear}
          aria-label="ล้างตัวกรอง"
          title="ล้างตัวกรอง"
          className="size-10"
        >
          <X aria-hidden="true" />
        </Button>

        <Button type="submit" className="h-10 shrink-0 px-3 sm:px-4">
          <Search aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">ค้นหา</span>
        </Button>
      </form>
    </div>
  );
}

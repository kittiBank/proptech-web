"use client";

import { useState } from "react";
import { House, KeyRound, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SearchState } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import type { ListingMode } from "@/types/property";

const modes: { value: ListingMode; label: string; icon: typeof House }[] = [
  { value: "buy", label: "ซื้อ", icon: House },
  { value: "rent", label: "เช่า", icon: KeyRound },
];

/** Buy/Rent switch (applies at once) and the keyword box (applies on submit). */
export function SearchBar({
  state,
  onChange,
}: {
  state: SearchState;
  onChange: (change: Partial<SearchState>) => void;
}) {
  // Local text while typing; reset whenever the URL keyword changes (Back, chips, clear).
  const [keyword, setKeyword] = useState(state.keyword);
  const [syncedKeyword, setSyncedKeyword] = useState(state.keyword);
  if (syncedKeyword !== state.keyword) {
    setSyncedKeyword(state.keyword);
    setKeyword(state.keyword);
  }

  return (
    <form
      role="search"
      aria-label="ค้นหาประกาศ"
      onSubmit={(e) => {
        e.preventDefault();
        onChange({ keyword: keyword.trim() });
      }}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <div
        role="group"
        aria-label="ต้องการซื้อหรือเช่า"
        className="grid shrink-0 grid-cols-2 gap-1 rounded-md bg-mist p-1"
      >
        {modes.map(({ value, label, icon: Icon }) => {
          const active = state.mode === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ mode: value })}
              className={cn(
                "inline-flex h-9 min-w-[88px] items-center justify-center gap-1.5 rounded-sm px-4 text-[15px] font-medium text-slate transition-colors hover:text-ink",
                active && "bg-white text-ink ring-1 ring-line-strong [&_svg]:text-brand",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-1 gap-2">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-line-strong bg-white px-3 transition-colors focus-within:border-brand hover:border-ink">
          <Search className="size-4 shrink-0 text-slate" aria-hidden="true" />
          <span className="sr-only">ทำเล เขต หรือชื่อโครงการ</span>
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="ทำเล เขต หรือชื่อโครงการ"
            className="h-full w-full min-w-0 bg-transparent text-[16px] text-ink outline-none placeholder:text-slate/80"
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>
        <Button type="submit" className="shrink-0">
          ค้นหา
        </Button>
      </div>
    </form>
  );
}

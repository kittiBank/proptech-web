"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { defaultFilters, toSearchParams } from "@/lib/search";
import type { ListingMode, SearchFilters } from "@/types/property";

interface HomeSearchContextValue {
  /** Filters being edited in the hero form. */
  draft: SearchFilters;
  setDraft: (update: Partial<SearchFilters>) => void;
  /** Open /search with the draft filters. */
  submit: () => void;
  /** Clear every filter but keep Buy/Rent. */
  clearFilters: () => void;
  /** Switch Buy/Rent from anywhere (header nav) and bring the form into view. */
  focusMode: (mode: ListingMode) => void;
}

const HomeSearchContext = createContext<HomeSearchContextValue | null>(null);

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ block: "start" });
}

export function HomeSearchProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [draft, setDraftState] = useState<SearchFilters>(defaultFilters);

  const setDraft = useCallback((update: Partial<SearchFilters>) => {
    setDraftState((prev) => {
      const next = { ...prev, ...update };
      // Price brackets differ between sale and rent.
      if (update.mode && update.mode !== prev.mode) next.priceRange = "any";
      return next;
    });
  }, []);

  const submit = useCallback(() => router.push(`/search?${toSearchParams(draft).toString()}`), [draft, router]);

  const clearFilters = useCallback(() => {
    setDraftState((prev) => ({ ...defaultFilters, mode: prev.mode }));
  }, []);

  const focusMode = useCallback(
    (mode: ListingMode) => {
      setDraft({ mode });
      scrollToId("search");
      requestAnimationFrame(() => document.getElementById("search-keyword")?.focus({ preventScroll: true }));
    },
    [setDraft],
  );

  const value = useMemo(
    () => ({ draft, setDraft, submit, clearFilters, focusMode }),
    [draft, setDraft, submit, clearFilters, focusMode],
  );

  return <HomeSearchContext value={value}>{children}</HomeSearchContext>;
}

export function useHomeSearch() {
  return useContext(HomeSearchContext);
}

export function useRequiredHomeSearch() {
  const ctx = useContext(HomeSearchContext);
  if (!ctx) throw new Error("useRequiredHomeSearch must be used inside <HomeSearchProvider>");
  return ctx;
}

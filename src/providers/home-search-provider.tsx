"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { defaultFilters } from "@/lib/search";
import type { ListingMode, SearchFilters } from "@/types/property";

interface HomeSearchContextValue {
  /** Filters being edited in the hero form. */
  draft: SearchFilters;
  setDraft: (update: Partial<SearchFilters>) => void;
  /** Filters last submitted; `null` until the visitor searches. */
  applied: SearchFilters | null;
  submit: (override?: Partial<SearchFilters>) => void;
  reset: () => void;
  /** Switch Buy/Rent from anywhere (header nav) and bring the form into view. */
  focusMode: (mode: ListingMode) => void;
}

const HomeSearchContext = createContext<HomeSearchContextValue | null>(null);

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ block: "start" });
}

export function HomeSearchProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<SearchFilters>(defaultFilters);
  const [applied, setApplied] = useState<SearchFilters | null>(null);

  const setDraft = useCallback((update: Partial<SearchFilters>) => {
    setDraftState((prev) => {
      const next = { ...prev, ...update };
      // Price brackets differ between sale and rent.
      if (update.mode && update.mode !== prev.mode) next.priceRange = "any";
      return next;
    });
  }, []);

  const submit = useCallback(
    (override?: Partial<SearchFilters>) => {
      const next = { ...draft, ...override };
      if (override) setDraftState(next);
      setApplied(next);
      requestAnimationFrame(() => scrollToId("listings"));
    },
    [draft],
  );

  const reset = useCallback(() => {
    setApplied(null);
    setDraftState(defaultFilters);
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
    () => ({ draft, setDraft, applied, submit, reset, focusMode }),
    [draft, setDraft, applied, submit, reset, focusMode],
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

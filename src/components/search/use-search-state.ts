"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseSearchParams, toSearchQueryString, updateSearchState, type SearchState } from "@/lib/search-params";

/**
 * The /search page state, read from and written to the URL.
 *
 * Page and view changes add a history entry so Back steps through them;
 * filter changes replace the current entry so ticking checkboxes does not
 * flood the history. Neither scrolls the page.
 */
export function useSearchState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useMemo(() => parseSearchParams(searchParams), [searchParams]);

  const navigate = useCallback(
    (next: SearchState, mode: "push" | "replace") => {
      router[mode](`/search?${toSearchQueryString(next)}`, { scroll: false });
    },
    [router],
  );

  /** Merge a change into the current state; filter changes go back to page 1. */
  const update = useCallback(
    (change: Partial<SearchState>) => {
      const onlyPaging = Object.keys(change).every((key) => key === "page" || key === "view");
      navigate(updateSearchState(state, change), onlyPaging ? "push" : "replace");
    },
    [navigate, state],
  );

  /** Replace the whole state, e.g. when the mobile filter sheet is applied. */
  const replace = useCallback((next: SearchState) => navigate({ ...next, page: 1 }, "replace"), [navigate]);

  return { state, update, replace };
}

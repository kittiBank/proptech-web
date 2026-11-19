import { SearchSkeleton } from "@/components/search/search-view";

/** Shown instantly on navigation while the search page loads. */
export default function Loading() {
  return <SearchSkeleton />;
}

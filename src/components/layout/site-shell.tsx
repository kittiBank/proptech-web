import type { ReactNode } from "react";
import { HomeSearchProvider } from "@/providers/home-search-provider";
import { QueryProvider } from "@/providers/query-provider";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { SkipLink } from "./skip-link";

/**
 * Page chrome shared by every public page: skip link, header, main landmark,
 * footer. Used by `app/(site)/layout.tsx` and by the root `not-found.tsx`
 * (unmatched URLs render outside any route group, so they need it directly).
 *
 * QueryProvider holds the TanStack Query cache for every page's API data.
 * HomeSearchProvider sits here because the header's Buy/Rent links drive the
 * homepage hero search. It holds a few strings of client state, so wrapping
 * other pages costs nothing.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <HomeSearchProvider>
        <SkipLink />
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </HomeSearchProvider>
    </QueryProvider>
  );
}

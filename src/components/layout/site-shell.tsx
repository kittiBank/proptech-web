import type { ReactNode } from "react";
import { HomeSearchProvider } from "@/providers/home-search-provider";
import { QueryProvider } from "@/providers/query-provider";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

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
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-ink px-4 py-3 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          ข้ามไปยังเนื้อหาหลัก
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </HomeSearchProvider>
    </QueryProvider>
  );
}

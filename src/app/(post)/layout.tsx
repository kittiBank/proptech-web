import type { Metadata } from "next";
import type { ReactNode } from "react";
import { QueryProvider } from "@/providers/query-provider";

/** Private, per-user pages: keep them out of search results. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The posting wizard (C1–C7) has its own minimal header and sticky footer, so
 * it sits outside the site chrome; no bottom nav on a multi-step form.
 */
export default function PostLayout({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}

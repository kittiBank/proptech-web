import type { Metadata } from "next";
import type { ReactNode } from "react";
import { QueryProvider } from "@/providers/query-provider";

/** Private, per-user pages: keep them out of search results. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Sign-in, sign-up and account recovery (B1–B4, B6). These pages have their
 * own chrome: no site header, footer or bottom nav, so nothing pulls the
 * visitor away mid-form.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}

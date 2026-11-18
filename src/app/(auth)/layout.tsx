import type { ReactNode } from "react";
import { QueryProvider } from "@/providers/query-provider";

/**
 * Sign-in, sign-up and account recovery (B1–B4, B6). These pages have their
 * own chrome: no site header, footer or bottom nav, so nothing pulls the
 * visitor away mid-form.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}

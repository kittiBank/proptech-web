import type { Metadata } from "next";
import type { ReactNode } from "react";
import { QueryProvider } from "@/providers/query-provider";

/**
 * Admin app (E1–E11). Served on its own subdomain through `proxy.ts` (`ADMIN_HOST`), or at
 * `/admin` locally. No site chrome; never indexed.
 */
export const metadata: Metadata = {
  title: { default: "PropertyHub Admin", template: "%s | PropertyHub Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}

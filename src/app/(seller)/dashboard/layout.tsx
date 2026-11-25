import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { SellerShell } from "@/components/seller/seller-shell";
import { QueryProvider } from "@/providers/query-provider";

/** Private, per-user pages: keep them out of search results. */
export const metadata: Metadata = {
  title: { default: "แดชบอร์ดผู้ลงประกาศ", template: "%s | ผู้ลงประกาศ PropertyHub" },
  robots: { index: false, follow: false },
};

/**
 * Lister workspace (C8–C16). It has its own header and sidebar instead of the
 * site chrome. The shell reads the pathname, so it renders on the client.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <Suspense>
        <SellerShell>{children}</SellerShell>
      </Suspense>
    </QueryProvider>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AccountShell } from "@/components/account/account-shell";

/** Private, per-user pages: keep them out of search results. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AccountShell } from "@/components/account/account-shell";

/** Private, per-user page: same shell and sign-in gate as `/account`, kept out of search results. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function NotificationsLayout({ children }: { children: ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}

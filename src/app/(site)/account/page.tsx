import type { Metadata } from "next";
import { AccountMenuView } from "@/components/account/account-menu-view";

export const metadata: Metadata = { title: "บัญชี" };

/** Phone account menu (B20); desktop goes straight to the profile, since the sidebar lists the rest. */
export default function AccountPage() {
  return <AccountMenuView />;
}

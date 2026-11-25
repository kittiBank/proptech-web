import type { Metadata } from "next";
import { ListingsView } from "@/components/seller/listings-view";

export const metadata: Metadata = { title: "ประกาศของฉัน" };

/** My listings (C9, C11) with the boost dialog on `?boost=id1,id2` (C14). Filters live in the URL. */
export default function DashboardListingsPage() {
  return <ListingsView />;
}

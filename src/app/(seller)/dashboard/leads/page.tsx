import type { Metadata } from "next";
import { LeadsView } from "@/components/seller/leads-view";

export const metadata: Metadata = { title: "ผู้สนใจและนัดหมาย" };

/** Viewing requests to answer, the weekly calendar, availability and all leads (C10). */
export default function DashboardLeadsPage() {
  return <LeadsView />;
}

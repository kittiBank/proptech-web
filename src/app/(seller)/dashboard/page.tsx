import type { Metadata } from "next";
import { OverviewView } from "@/components/seller/overview-view";

export const metadata: Metadata = { title: "ภาพรวม" };

/** Seller overview (C8): KPIs, daily views, to-do list and top listings. */
export default function DashboardPage() {
  return <OverviewView />;
}

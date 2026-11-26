import { Suspense } from "react";
import type { Metadata } from "next";
import { ReportsView } from "@/components/admin/reports-view";

export const metadata: Metadata = { title: "รายงานจากผู้ใช้" };

/** E4 */
export default function ReportsPage() {
  return (
    <Suspense>
      <ReportsView />
    </Suspense>
  );
}

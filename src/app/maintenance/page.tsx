import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { MaintenanceView } from "@/components/system/maintenance-view";
import { maintenanceWindow } from "@/lib/maintenance";

export const metadata: Metadata = { title: "ปิดปรับปรุงระบบ", robots: { index: false } };

/** The window comes from env at request time, not at build time. */
async function ScheduledMaintenance() {
  await connection();
  return <MaintenanceView schedule={maintenanceWindow()} />;
}

/**
 * D10 right. Outside the site shell: during maintenance the API is down, so the page must not
 * depend on it. `proxy.ts` serves it for every page with HTTP 503 while `MAINTENANCE_MODE=on`.
 */
export default function MaintenancePage() {
  return (
    <Suspense>
      <ScheduledMaintenance />
    </Suspense>
  );
}

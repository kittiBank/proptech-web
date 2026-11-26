"use client";

import { RouteError } from "@/components/system/route-error";

/** A failing dashboard page keeps the seller sidebar, so the other pages stay one click away. */
export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  return <RouteError error={error} retry={retry} />;
}

import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/site-shell";
import { NotFoundView } from "@/components/system/not-found-view";

export const metadata: Metadata = { title: "ไม่พบหน้า", robots: { index: false } };

/** D8: any unmatched URL. Renders outside the route groups, so it brings the site shell. */
export default function NotFound() {
  return (
    <SiteShell>
      <NotFoundView />
    </SiteShell>
  );
}

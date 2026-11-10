import type { ReactNode } from "react";
import { SiteShell } from "@/components/layout/site-shell";

/** Every page in this group shares the header and footer. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}

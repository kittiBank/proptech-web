import type { ReactNode } from "react";
import { SiteShell } from "@/components/layout/site-shell";

/** Every page in this group shares the header and footer; `modal` holds the intercepted login dialog. */
export default function SiteLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <SiteShell>
      {children}
      {modal}
    </SiteShell>
  );
}

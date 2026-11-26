import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

/** Signed-in admin pages. The shell checks the admin session and reads the pathname on the client. */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

"use client";

import "@fontsource-variable/dm-sans";
import "@fontsource/ibm-plex-sans-thai/thai-400.css";
import "@fontsource/ibm-plex-sans-thai/thai-600.css";
import "./globals.css";
import { RouteError } from "@/components/system/route-error";

/** Last resort when the root layout itself fails: replaces the whole document. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <title>ระบบขัดข้องชั่วคราว | PropertyHub</title>
        <RouteError error={error} retry={retry} withLogo className="flex-1" />
      </body>
    </html>
  );
}

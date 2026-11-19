"use client";

import { RouteError } from "@/components/system/route-error";

/** Any failure inside a public page; the header and footer stay usable. */
export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  return <RouteError error={error} retry={retry} />;
}

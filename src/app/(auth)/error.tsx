"use client";

import { RouteError } from "@/components/system/route-error";

/** Auth pages have no site chrome, so the error brings its own logo bar. */
export default function AuthError({ error, retry }: { error: unknown; retry: () => void }) {
  return <RouteError error={error} retry={retry} withLogo />;
}

import type { ReactNode } from "react";
import { dehydrate, HydrationBoundary, QueryClient, type QueryKey } from "@tanstack/react-query";

/**
 * Seeds TanStack Query with data the server already has, so a client view
 * renders its first screen (and its LCP photo) in the HTML instead of after a
 * browser fetch. Keys must match the view's own `useQuery` keys (`lib/api/queries.ts`);
 * the view refetches as usual once the data is stale.
 */
export function Prefetched({
  queries,
  children,
}: {
  queries: { queryKey: QueryKey; data: unknown }[];
  children: ReactNode;
}) {
  const client = new QueryClient();
  for (const { queryKey, data } of queries) {
    if (data !== undefined) client.setQueryData(queryKey, data);
  }
  return <HydrationBoundary state={dehydrate(client)}>{children}</HydrationBoundary>;
}

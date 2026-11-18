import type { ReactElement } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { makeQueryClient } from "@/providers/query-provider";

/** Renders with a fresh query client (no retries) so components can talk to the mock API. */
export function renderWithClient(ui: ReactElement) {
  const client = makeQueryClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } });
  return { client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) };
}

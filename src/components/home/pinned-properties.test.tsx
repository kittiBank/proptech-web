import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { failingHandler } from "@/mocks/handlers";
import { server } from "@/mocks/node";
import { makeQueryClient } from "@/providers/query-provider";
import { PinnedProperties } from "./pinned-properties";

function renderWithQuery(ui: ReactNode) {
  const client = makeQueryClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("PinnedProperties", () => {
  it("shows a skeleton, then the pinned listings", async () => {
    renderWithQuery(<PinnedProperties />);

    expect(screen.getByRole("status", { name: "กำลังโหลดประกาศไฮไลต์" })).toBeInTheDocument();
    expect(await screen.findAllByRole("article")).toHaveLength(8);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows an error with a working retry", async () => {
    const user = userEvent.setup();
    server.use(failingHandler("/properties"));
    renderWithQuery(<PinnedProperties />);

    expect(await screen.findByRole("alert")).toHaveTextContent("โหลดประกาศไฮไลต์ไม่สำเร็จ");

    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "ลองอีกครั้ง" }));
    expect(await screen.findAllByRole("article")).toHaveLength(8);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

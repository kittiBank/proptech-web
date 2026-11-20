import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { failingHandler } from "@/mocks/handlers";
import { server } from "@/mocks/node";
import { listSavedSearches } from "@/mocks/saved-searches";
import { setMockScenario } from "@/mocks/scenario";
import { currentUser, resetMockSession } from "@/mocks/session";
import { router, setPathname, setSearchParams } from "@/test/next-navigation";
import { makeQueryClient } from "@/providers/query-provider";
import { SearchView } from "./search-view";

function renderAt(query: string, ui: ReactNode = <SearchView />) {
  setSearchParams(query);
  const client = makeQueryClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } });
  return { client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) };
}

/** The URL the last navigation went to, as params. */
const lastUrl = (fn: ReturnType<typeof vi.fn>) => new URLSearchParams(String(fn.mock.lastCall?.[0]).split("?")[1]);

beforeEach(() => {
  setPathname("/search");
  Element.prototype.scrollIntoView = vi.fn();
});

describe("SearchView", () => {
  it("shows results for the filters in the URL", async () => {
    renderAt("mode=rent&type=condo");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("เช่าคอนโด");
    expect(screen.getByRole("status", { name: "กำลังโหลดผลการค้นหา" })).toBeInTheDocument();
    expect((await screen.findAllByRole("article")).length).toBeGreaterThan(0);
    expect(screen.getByText(/^พบ/)).toHaveTextContent(/พบ \d+ ประกาศ/);
    expect(screen.getByRole("button", { name: "เอาตัวกรอง คอนโด ออก" })).toBeInTheDocument();
  });

  it("removes a filter from the URL when its chip is cleared", async () => {
    const user = userEvent.setup();
    renderAt("mode=buy&station=E4,N5&page=2");

    await user.click(await screen.findByRole("button", { name: "เอาตัวกรอง BTS อโศก ออก" }));

    const url = lastUrl(router.replace);
    expect(url.get("station")).toBe("N5");
    expect(url.has("page")).toBe(false);
  });

  it("applies the keyword on submit and keeps paging in history", async () => {
    const user = userEvent.setup();
    renderAt("mode=buy");

    await user.type(screen.getByRole("searchbox", { name: "ทำเล เขต หรือชื่อโครงการ" }), "สาทร{Enter}");
    expect(lastUrl(router.replace).get("q")).toBe("สาทร");

    const pager = await screen.findByRole("navigation", { name: "หน้าผลการค้นหา" });
    await user.click(within(pager).getByRole("button", { name: "หน้า 2" }));
    expect(lastUrl(router.push).get("page")).toBe("2");
  });

  it("filters by bedrooms from the sidebar", async () => {
    const user = userEvent.setup();
    renderAt("mode=buy");

    const sidebar = screen.getByRole("complementary", { name: "ตัวกรอง" });
    await user.click(within(sidebar).getByRole("button", { name: "3+" }));
    expect(lastUrl(router.replace).get("beds")).toBe("3");
  });

  it("suggests looser searches with their counts when nothing matches (D11)", async () => {
    renderAt("mode=buy&type=condo&q=no-such-place-xyz");

    expect(await screen.findByRole("heading", { name: "ยังไม่มีประกาศที่ตรงทุกเงื่อนไข" })).toBeInTheDocument();
    const withoutKeyword = await screen.findByRole("link", { name: /ไม่ใช้คำค้น “no-such-place-xyz”/ });
    expect(withoutKeyword).toHaveAttribute("href", "/search?mode=buy&type=condo");
    expect(withoutKeyword).toHaveTextContent(/\d+ ประกาศ/);
  });

  it("offers to clear filters when no looser search finds anything", async () => {
    const user = userEvent.setup();
    setMockScenario("empty");
    renderAt("mode=buy&q=no-such-place-xyz");

    await user.click(await screen.findByRole("button", { name: "ล้างตัวกรองทั้งหมด" }));
    expect(lastUrl(router.replace).toString()).toBe("mode=buy");
  });

  it("saves the search for alerts after signing in", async () => {
    const user = userEvent.setup();
    const { client } = renderAt("mode=buy&type=condo&q=no-such-place-xyz&sort=price-asc&page=2");
    await screen.findByRole("heading", { name: "ยังไม่มีประกาศที่ตรงทุกเงื่อนไข" });

    await user.click(screen.getByRole("button", { name: "รับแจ้งเตือน" }));
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(expect.stringContaining("/login?intent=save-search"), { scroll: false }),
    );
    expect(listSavedSearches("u-1")).toEqual([]);

    // Signing in refreshes the session; the pending save then runs by itself.
    resetMockSession({ signedIn: true });
    await client.invalidateQueries({ queryKey: ["auth", "session"] });
    expect(await screen.findByRole("button", { name: "บันทึกแล้ว" })).toBeDisabled();
    const user1 = currentUser()!;
    expect(listSavedSearches(user1.id)).toMatchObject([
      { name: "ซื้อคอนโด", query: "mode=buy&q=no-such-place-xyz&type=condo" },
    ]);
  });

  it("shows an error with a retry", async () => {
    server.use(failingHandler("/properties"));
    renderAt("mode=buy");

    expect(await screen.findByRole("alert")).toHaveTextContent("โหลดผลการค้นหาไม่สำเร็จ");
  });
});

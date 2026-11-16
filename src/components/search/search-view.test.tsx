import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { failingHandler } from "@/mocks/handlers";
import { server } from "@/mocks/node";
import { makeQueryClient } from "@/providers/query-provider";
import { SearchView } from "./search-view";

const router = { push: vi.fn(), replace: vi.fn() };
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
  usePathname: () => "/search",
}));

function renderAt(query: string, ui: ReactNode = <SearchView />) {
  searchParams = new URLSearchParams(query);
  const client = makeQueryClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** The URL the last navigation went to, as params. */
const lastUrl = (fn: ReturnType<typeof vi.fn>) => new URLSearchParams(String(fn.mock.lastCall?.[0]).split("?")[1]);

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
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

  it("explains an empty result and offers to clear filters", async () => {
    const user = userEvent.setup();
    renderAt("mode=buy&q=no-such-place-xyz");

    expect(await screen.findByText("ไม่พบประกาศที่ตรงกับเงื่อนไข")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ล้างตัวกรองทั้งหมด" }));
    expect(lastUrl(router.replace).toString()).toBe("mode=buy");
  });

  it("shows an error with a retry", async () => {
    server.use(failingHandler("/properties"));
    renderAt("mode=buy");

    expect(await screen.findByRole("alert")).toHaveTextContent("โหลดผลการค้นหาไม่สำเร็จ");
  });
});

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { listFavorites, seedDemoFavorites } from "@/mocks/favorites";
import { resetMockSession } from "@/mocks/session";
import { router, setPathname, setSearchParams } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import { CompareView } from "./compare-view";
import { FavoritesView } from "./favorites-view";

/** Desktop width, so three listings can be compared and the card grid applies. */
function setWide(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide && query.includes("min-width"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  setPathname("/account/favorites");
  resetMockSession({ signedIn: true });
  setWide(true);
});

/** Cards live in the desktop list; the phone rows repeat them. */
const cards = () => screen.getAllByRole("article");

describe("FavoritesView", () => {
  it("shows the empty state", async () => {
    renderWithClient(<FavoritesView />);
    expect(await screen.findByRole("heading", { name: "ยังไม่มีประกาศที่บันทึกไว้" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "เริ่มค้นหาประกาศ" })).toHaveAttribute("href", "/search");
  });

  it("shows price drops and closed listings", async () => {
    seedDemoFavorites();
    renderWithClient(<FavoritesView />);
    await waitFor(() => expect(cards().length).toBe(6));
    expect(screen.getByText(/^ลด ฿300,000/)).toBeInTheDocument();
    // Closed listings sink to the end and cannot be compared.
    const closed = cards().at(-1)!;
    expect(within(closed).getByText("ประกาศนี้ปิดแล้ว")).toBeInTheDocument();
    expect(within(closed).getByRole("checkbox")).toBeDisabled();
    expect(within(closed).getByRole("link", { name: "ดูประกาศคล้ายกันในย่านนี้" })).toBeInTheDocument();
  });

  it("selects up to 3 listings and links to compare", async () => {
    const user = userEvent.setup();
    seedDemoFavorites();
    renderWithClient(<FavoritesView />);
    await waitFor(() => expect(cards().length).toBe(6));

    const boxes = cards().map((c) => within(c).getByRole("checkbox"));
    await user.click(boxes[0]);
    expect(screen.getByRole("region", { name: "เปรียบเทียบประกาศ" })).toHaveTextContent("เลือกแล้ว 1 จาก 3");
    expect(screen.getByRole("button", { name: "เปรียบเทียบ" })).toBeDisabled();

    await user.click(boxes[1]);
    await user.click(boxes[2]);
    expect(boxes[3]).toBeDisabled();
    const link = screen.getByRole("link", { name: "เปรียบเทียบ" });
    expect(link.getAttribute("href")).toMatch(/^\/compare\?ids=[^,]+,[^,]+,[^,]+$/);
  });

  it("removes a favorite with undo", async () => {
    const user = userEvent.setup();
    seedDemoFavorites();
    renderWithClient(<FavoritesView />);
    await waitFor(() => expect(cards().length).toBe(6));
    const first = cards()[0];
    const title = within(first).getByRole("heading").textContent!;
    await user.click(within(first).getByRole("button", { name: `นำ ${title} ออกจากรายการโปรด` }));
    await waitFor(() => expect(cards().length).toBe(5));
    await waitFor(() => expect(listFavorites()).toHaveLength(5));
    await user.click(screen.getByRole("button", { name: "เลิกทำ" }));
    await waitFor(() => expect(listFavorites()).toHaveLength(6));
  });

  it("edits a note", async () => {
    const user = userEvent.setup();
    seedDemoFavorites();
    renderWithClient(<FavoritesView />);
    await waitFor(() => expect(cards().length).toBe(6));
    await user.click(within(cards()[1]).getByRole("button", { name: /^เพิ่มโน้ตให้/ }));
    await user.type(screen.getByLabelText(/โน้ตส่วนตัว/), "ชอบวิว");
    await user.click(screen.getByRole("button", { name: "บันทึกโน้ต" }));
    expect(await screen.findByText("โน้ต: ชอบวิว")).toBeInTheDocument();
  });
});

describe("CompareView", () => {
  it("tints the best values and hides identical rows by default", async () => {
    const user = userEvent.setup();
    setSearchParams("ids=p-1001,p-1003");
    renderWithClient(<CompareView />);
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getAllByText("ดีที่สุด").length).toBeGreaterThan(0);

    const rowsBefore = screen.getAllByRole("row").length;
    const toggle = screen.getByRole("switch", { name: "แสดงเฉพาะที่ต่างกัน" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await user.click(toggle);
    expect(screen.getAllByRole("row").length).toBeGreaterThanOrEqual(rowsBefore);
  });

  it("removes a column through the URL", async () => {
    const user = userEvent.setup();
    setSearchParams("ids=p-1001,p-1003");
    renderWithClient(<CompareView />);
    const remove = await screen.findAllByRole("button", { name: /ออกจากการเปรียบเทียบ$/ });
    await user.click(remove[0]);
    expect(router.replace).toHaveBeenCalledWith("/compare?ids=p-1003", { scroll: false });
  });

  it("asks to pick listings when there are no ids", () => {
    setSearchParams("");
    renderWithClient(<CompareView />);
    expect(screen.getByRole("heading", { name: "ยังไม่ได้เลือกประกาศที่จะเปรียบเทียบ" })).toBeInTheDocument();
  });
});

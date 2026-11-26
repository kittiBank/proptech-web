import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { onlineManager } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FavoritesView } from "@/components/favorites/favorites-view";
import { PropertyDetailView } from "@/components/listing/property-detail-view";
import { listFavorites, seedDemoFavorites } from "@/mocks/favorites";
import { listSavedSearches } from "@/mocks/saved-searches";
import { resetMockSession } from "@/mocks/session";
import { setParams, setPathname } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import { NotFoundView } from "./not-found-view";
import { OfflineBanner } from "./offline-banner";

afterEach(() => {
  act(() => onlineManager.setOnline(true));
  window.localStorage.clear();
  vi.useRealTimers();
});

describe("NotFoundView (D8)", () => {
  it("offers a search and popular stations", () => {
    renderWithClient(<NotFoundView />);
    expect(screen.getByRole("heading", { level: 1, name: "ไม่พบหน้าที่คุณหา" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "ค้นหาประกาศ" })).toHaveAttribute("name", "q");
    expect(screen.getByRole("link", { name: "E5 พร้อมพงษ์" })).toHaveAttribute("href", "/search?station=E5");
    expect(screen.getByRole("link", { name: "ศูนย์ช่วยเหลือ" })).toHaveAttribute("href", "/help");
  });
});

describe("Listing page system states", () => {
  beforeEach(() => resetMockSession({ signedIn: true }));

  it("shows D9 for a sold listing, drops it from favorites and offers alerts", async () => {
    seedDemoFavorites();
    setParams({ slug: "listing-2010" });
    setPathname("/property/listing-2010");
    renderWithClient(<PropertyDetailView />);

    expect(await screen.findByRole("heading", { level: 1, name: "ประกาศนี้ขายไปแล้ว" })).toBeInTheDocument();
    expect(screen.getByText(/ปิดเมื่อ/)).toHaveTextContent("PH-");
    expect(await screen.findByText("ประกาศนี้ถูกนำออกจากรายการโปรดของคุณแล้ว")).toBeInTheDocument();
    expect(listFavorites().some((f) => f.property.id === "g-2010")).toBe(false);
    expect(await screen.findByRole("heading", { name: "ห้องคล้ายกันที่ยังว่าง" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "แจ้งเตือนเมื่อมีห้องในโครงการนี้" }));
    expect(await screen.findByRole("button", { name: "เปิดการแจ้งเตือนแล้ว" })).toBeDisabled();
    expect(listSavedSearches("u-1")[0]?.query).toContain("q=");
  });

  it("says when a listing was taken down", async () => {
    setParams({ slug: "listing-2031" });
    renderWithClient(<PropertyDetailView />);
    expect(await screen.findByRole("heading", { level: 1, name: "ประกาศนี้ถูกปิดแล้ว" })).toBeInTheDocument();
    expect(screen.queryByText(/ถูกนำออกจากรายการโปรด/)).not.toBeInTheDocument();
  });

  it("shows D8 for an unknown listing", async () => {
    setParams({ slug: "no-such-listing" });
    renderWithClient(<PropertyDetailView />);
    expect(await screen.findByRole("heading", { level: 1, name: "ไม่พบประกาศนี้" })).toBeInTheDocument();
  });
});

describe("Offline (D14)", () => {
  it("shows the banner while the connection is down", () => {
    renderWithClient(<OfflineBanner />);
    expect(screen.queryByText("ไม่มีการเชื่อมต่ออินเทอร์เน็ต")).not.toBeInTheDocument();
    act(() => onlineManager.setOnline(false));
    expect(screen.getByText("ไม่มีการเชื่อมต่ออินเทอร์เน็ต")).toBeInTheDocument();
    act(() => onlineManager.setOnline(true));
    expect(screen.queryByText("ไม่มีการเชื่อมต่ออินเทอร์เน็ต")).not.toBeInTheDocument();
  });

  it("shows the favorites saved on this device", async () => {
    resetMockSession({ signedIn: true });
    seedDemoFavorites();
    setPathname("/account/favorites");
    // One visit online leaves a copy on the device.
    const first = renderWithClient(<FavoritesView />);
    await waitFor(() => expect(screen.getAllByRole("article").length).toBeGreaterThan(0));
    first.unmount();

    act(() => onlineManager.setOnline(false));
    renderWithClient(<FavoritesView />);
    expect(await screen.findByText(/แสดงข้อมูลที่บันทึกไว้ในเครื่อง/)).toBeInTheDocument();
    expect(screen.getAllByRole("article").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "ลองเชื่อมต่ออีกครั้ง" })).toBeInTheDocument();
  });
});

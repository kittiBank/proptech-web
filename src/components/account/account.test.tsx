import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProfile } from "@/mocks/account";
import { MOCK_OTP_CODE } from "@/mocks/constants";
import { listNotifications } from "@/mocks/notifications";
import { createSavedSearch, listSavedSearches } from "@/mocks/saved-searches";
import { currentUser, resetMockSession } from "@/mocks/session";
import { router } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import { AccountMenuView } from "./account-menu-view";
import { NotificationsView } from "./notifications-view";
import { ProfileView } from "./profile/profile-view";
import { SavedSearchesView } from "./saved-searches-view";

const me = () => currentUser()!;

beforeEach(() => resetMockSession({ signedIn: true }));

describe("AccountMenuView (B20)", () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it("lists the account pages on phones with counts and the notifications bell", async () => {
    createSavedSearch(me().id, { name: "เช่าใกล้อารีย์", query: "mode=rent&station=N5" });
    renderWithClient(<AccountMenuView />);
    expect(await screen.findByRole("heading", { level: 1, name: "บัญชี" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /การแจ้งเตือน 2 รายการใหม่/ }, { timeout: 3000 })).toHaveAttribute(
      "href",
      "/notifications",
    );
    expect(await screen.findByRole("link", { name: /การค้นหาที่บันทึกไว้\s*1/ })).toHaveAttribute(
      "href",
      "/account/saved-searches",
    );
    expect(await screen.findByRole("progressbar", { name: "ความครบถ้วนของโปรไฟล์" })).toHaveAttribute(
      "aria-valuenow",
      "40",
    );
  });

  it("forwards desktop visitors to the profile", async () => {
    window.matchMedia = ((query: string) => ({ ...original(query), matches: true })) as typeof window.matchMedia;
    renderWithClient(<AccountMenuView />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/account/profile"));
    expect(screen.queryByRole("heading", { name: "บัญชี" })).toBeNull();
  });
});

describe("ProfileView (B7)", () => {
  it("saves personal info and updates the account name", async () => {
    const user = userEvent.setup();
    renderWithClient(<ProfileView />);
    const form = await screen.findByRole("form", { name: "ข้อมูลส่วนตัว" });
    const first = within(form).getByLabelText("ชื่อ");
    await user.clear(first);
    await user.click(within(form).getByRole("button", { name: "บันทึกการเปลี่ยนแปลง" }));
    expect(await within(form).findByText("กรอกชื่อ")).toBeInTheDocument();

    await user.type(first, "สมใจ");
    await user.type(within(form).getByLabelText(/LINE ID/), "somjai.j");
    await user.click(within(form).getByRole("button", { name: "บันทึกการเปลี่ยนแปลง" }));
    expect(await screen.findByText("บันทึกข้อมูลส่วนตัวแล้ว")).toBeInTheDocument();
    expect(me().firstName).toBe("สมใจ");
    expect(getProfile(me()).lineId).toBe("somjai.j");
  });

  it("verifies the phone with an OTP", async () => {
    const user = userEvent.setup();
    renderWithClient(<ProfileView />);
    await user.click(await screen.findByRole("button", { name: "ส่งรหัส OTP" }));
    const code = await screen.findByLabelText(/รหัส 6 หลัก/);
    await user.type(code, "000000");
    await user.click(screen.getByRole("button", { name: "ยืนยัน" }));
    expect(await screen.findByText("รหัสไม่ถูกต้องหรือหมดอายุ")).toBeInTheDocument();

    await user.clear(code);
    await user.type(code, MOCK_OTP_CODE);
    await user.click(screen.getByRole("button", { name: "ยืนยัน" }));
    expect(await screen.findByText("ยืนยันเบอร์โทรแล้ว")).toBeInTheDocument();
    expect(getProfile(me()).phoneVerified).toBe(true);
  });

  it("toggles notification channels and needs LINE linked for LINE alerts", async () => {
    const user = userEvent.setup();
    renderWithClient(<ProfileView />);
    const email = await screen.findByRole("switch", { name: "ราคาลดในรายการโปรด (อีเมล)" });
    expect(email).toHaveAttribute("aria-checked", "true");
    await user.click(email);
    await waitFor(() => expect(getProfile(me()).notifications.price_drop.email).toBe(false));

    const line = screen.getByRole("switch", { name: "ราคาลดในรายการโปรด (LINE)" });
    expect(line).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "เชื่อม LINE" }));
    await waitFor(() => expect(line).toBeEnabled());
  });

  it("changes the password after checking the current one", async () => {
    const user = userEvent.setup();
    renderWithClient(<ProfileView />);
    await user.click(await screen.findByRole("button", { name: "เปลี่ยนรหัสผ่าน" }));
    const dialog = await screen.findByRole("dialog", { name: "เปลี่ยนรหัสผ่าน" });
    await user.type(within(dialog).getByLabelText("รหัสผ่านปัจจุบัน"), "wrong-one");
    await user.type(within(dialog).getByLabelText("รหัสผ่านใหม่"), "NewPassword2");
    await user.click(within(dialog).getByRole("button", { name: "บันทึกรหัสผ่านใหม่" }));
    expect(await within(dialog).findByText("รหัสผ่านปัจจุบันไม่ถูกต้อง")).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText("รหัสผ่านปัจจุบัน"));
    await user.type(within(dialog).getByLabelText("รหัสผ่านปัจจุบัน"), "Password1");
    await user.click(within(dialog).getByRole("button", { name: "บันทึกรหัสผ่านใหม่" }));
    expect(await screen.findByText("เปลี่ยนรหัสผ่านแล้ว")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("deletes the account after confirming", async () => {
    const user = userEvent.setup();
    renderWithClient(<ProfileView />);
    await user.click(await screen.findByRole("button", { name: "ลบบัญชี" }));
    const dialog = await screen.findByRole("dialog", { name: "ลบบัญชีถาวร?" });
    await user.click(within(dialog).getByRole("button", { name: "ลบบัญชีถาวร" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/"));
    expect(currentUser()).toBeUndefined();
  });
});

describe("SavedSearchesView (B9)", () => {
  it("shows an empty state with a way to start searching", async () => {
    renderWithClient(<SavedSearchesView />);
    expect(await screen.findByRole("heading", { name: "ยังไม่มีการค้นหาที่บันทึกไว้" })).toBeInTheDocument();
  });

  it("lists criteria, saves alert changes, renames and deletes with undo", async () => {
    const user = userEvent.setup();
    createSavedSearch(me().id, { name: "คอนโดอโศก", query: "mode=buy&type=condo&station=E4&price=5-10m" });
    renderWithClient(<SavedSearchesView />);

    const card = await screen.findByRole("article", { name: "คอนโดอโศก" });
    const criteria = within(card).getByRole("list", { name: "เงื่อนไข" });
    expect(
      within(criteria)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["ซื้อ", "คอนโด", "BTS อโศก", "5 – 10 ล้าน"]);
    expect(within(card).getByRole("link", { name: "ดูผลการค้นหา" })).toHaveAttribute(
      "href",
      "/search?mode=buy&type=condo&station=E4&price=5-10m",
    );

    await user.click(within(card).getByRole("switch", { name: "LINE" }));
    await waitFor(() => expect(listSavedSearches(me().id)[0].alerts.line).toBe(true));
    await user.selectOptions(within(card).getByLabelText("ความถี่การแจ้งเตือน"), "weekly");
    await waitFor(() => expect(listSavedSearches(me().id)[0].alerts.frequency).toBe("weekly"));

    await user.click(within(card).getByRole("button", { name: "แก้ไข" }));
    const dialog = await screen.findByRole("dialog", { name: "แก้ไขชื่อการค้นหา" });
    const name = within(dialog).getByLabelText("ชื่อ");
    await user.clear(name);
    await user.type(name, "คอนโดใกล้ออฟฟิศ");
    await user.click(within(dialog).getByRole("button", { name: "บันทึก" }));
    expect(await screen.findByRole("article", { name: "คอนโดใกล้ออฟฟิศ" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ลบ" }));
    await waitFor(() => expect(listSavedSearches(me().id)).toEqual([]));
    await user.click(await screen.findByRole("button", { name: "เลิกทำ" }));
    await waitFor(() =>
      expect(listSavedSearches(me().id)).toMatchObject([
        { name: "คอนโดใกล้ออฟฟิศ", alerts: { line: true, frequency: "weekly" } },
      ]),
    );
  });
});

describe("NotificationsView (B19)", () => {
  it("filters by kind, marks one read on open and all read at once", async () => {
    const user = userEvent.setup();
    renderWithClient(<NotificationsView />);
    expect(await screen.findAllByText("ยังไม่อ่าน")).toHaveLength(2);

    await user.click(screen.getByRole("radio", { name: "ราคาลด" }));
    await waitFor(() => expect(screen.getAllByRole("link", { name: /ราคาลด/ })).toHaveLength(1));
    await user.click(screen.getByRole("link", { name: /ราคาลด ฿300,000/ }));
    await waitFor(() => expect(listNotifications(me().id).find((n) => n.kind === "price_drop")?.read).toBe(true));

    await user.click(screen.getByRole("radio", { name: "ทั้งหมด" }));
    await user.click(await screen.findByRole("button", { name: "อ่านทั้งหมด" }));
    await waitFor(() => expect(listNotifications(me().id).every((n) => n.read)).toBe(true));
    expect(screen.queryByText("ยังไม่อ่าน")).toBeNull();
  });
});

vi.setConfig({ testTimeout: 15_000 });

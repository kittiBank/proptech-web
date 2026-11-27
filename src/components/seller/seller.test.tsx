import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { listAppointments } from "@/mocks/inbox";
import { listSellerListings } from "@/mocks/seller";
import { currentUser, resetMockSession } from "@/mocks/session";
import { router, setPathname, setSearchParams } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import { LeadsView } from "./leads-view";
import { ListingsView } from "./listings-view";
import { OverviewView } from "./overview-view";
import { SellerShell } from "./seller-shell";

const me = () => currentUser()!.id;

describe("SellerShell", () => {
  it("asks signed-out visitors to log in", async () => {
    resetMockSession({ signedIn: false });
    setPathname("/dashboard");
    renderWithClient(<SellerShell>secret</SellerShell>);
    const main = await screen.findByRole("main");
    expect(await within(main).findByRole("link", { name: "เข้าสู่ระบบ" })).toHaveAttribute(
      "href",
      "/login?next=%2Fdashboard",
    );
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("shows the package, credit and pending requests", async () => {
    resetMockSession({ signedIn: true });
    setPathname("/dashboard/leads");
    renderWithClient(<SellerShell>content</SellerShell>);
    const nav = await screen.findByRole("navigation", { name: "เมนูผู้ลงประกาศ" });
    expect(await within(nav).findByText("นายหน้า Pro")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /ผู้สนใจและนัดหมาย/ })).toHaveAttribute("aria-current", "page");
    expect(await within(nav).findByText("คำขอรอยืนยัน", { exact: false })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /เครดิต ฿1,250/ })).toHaveAttribute("href", "/dashboard/billing");
  });
});

describe("OverviewView (C8)", () => {
  beforeEach(() => resetMockSession({ signedIn: true }));

  it("shows KPIs, the chart, the to-do list and top listings", async () => {
    renderWithClient(<OverviewView />);
    expect(await screen.findByText("ยอดเข้าชมประกาศ")).toBeInTheDocument();
    expect(screen.getByText("โทร 9 · แชต 11 · LINE 3")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /ยอดเข้าชมรายวัน 14 วันล่าสุด/ })).toBeInTheDocument();

    const todo = screen.getByRole("region", { name: "ต้องจัดการ" });
    expect(within(todo).getByText("คำขอนัด 3 รายการรอคุณยืนยัน")).toBeInTheDocument();
    expect(within(todo).getByRole("link", { name: /ดูคำขอ/ })).toHaveAttribute("href", "/dashboard/leads");
    // FE-24: straight into edit mode for the rejected listing.
    expect(within(todo).getByRole("link", { name: /แก้ไข/ })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/dashboard\/listings\/sl-[^/]+\/edit\/type$/),
    );

    const top = await screen.findByRole("table", { name: "ประกาศที่มีคนดูมากที่สุดใน 7 วัน" });
    const promote = (await within(top).findAllByRole("link", { name: /^โปรโมต/ }))[0];
    expect(promote.getAttribute("href")).toMatch(/^\/dashboard\/listings\?boost=sl-/);
  });

  it("switches the chart range", async () => {
    const user = userEvent.setup();
    renderWithClient(<OverviewView />);
    await user.click(await screen.findByRole("radio", { name: "90 วัน" }));
    expect(await screen.findByRole("img", { name: /90 วันล่าสุด/ })).toBeInTheDocument();
  });
});

describe("ListingsView (C9, C11, C14)", () => {
  beforeEach(() => {
    resetMockSession({ signedIn: true });
    setPathname("/dashboard/listings");
  });

  it("filters by status tab through the URL", async () => {
    const user = userEvent.setup();
    renderWithClient(<ListingsView />);
    const tab = await screen.findByRole("tab", { name: /ไม่ผ่าน\s*1/ });
    await user.click(tab);
    expect(router.push).toHaveBeenCalledWith("/dashboard/listings?status=rejected", { scroll: false });
  });

  it("opens the boost dialog for selected rows and starts a promotion", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithClient(<ListingsView />);
    const table = await screen.findByRole("table", { name: "ประกาศของฉัน" });
    const boxes = within(table).getAllByRole("checkbox", { name: /^เลือก / });
    await user.click(boxes[0]);
    await user.click(boxes[1]);
    const bar = screen.getByRole("region", { name: "การจัดการที่เลือก" });
    await user.click(within(bar).getByRole("button", { name: "ดันประกาศ" }));
    const [href] = router.push.mock.calls.at(-1)!;
    expect(href).toMatch(/^\/dashboard\/listings\?boost=sl-[^,]+,sl-/);

    // Load the page at the new URL: the dialog opens.
    const ids = listSellerListings(me(), { status: "published", limit: 50 })
      .data.filter((l) => !l.promotion)
      .slice(0, 2)
      .map((l) => l.id);
    setSearchParams(`boost=${ids.join(",")}`);
    unmount();
    renderWithClient(<ListingsView />);
    const dialog = await screen.findByRole("dialog", { name: "โปรโมต 2 ประกาศ" });
    await user.click(within(dialog).getByRole("radio", { name: /ประกาศแนะนำ 14 วัน/ }));
    expect(within(dialog).getByText("ใช้ช่องแพ็กเกจ 2 ช่อง")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "เริ่มโปรโมต" }));
    expect(await screen.findByText("เริ่มโปรโมต 2 ประกาศแล้ว")).toBeInTheDocument();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard/listings", { scroll: false }));
    expect(listSellerListings(me(), { ids: ids.join(",") }).data.every((l) => l.promotion?.kind === "featured")).toBe(
      true,
    );
    // Two renders plus a mutation: slow under a loaded full-suite run.
  }, 15_000);

  it("sends the boost to checkout when credit does not cover it", async () => {
    const user = userEvent.setup();
    const [first] = listSellerListings(me(), { status: "published" }).data;
    setSearchParams(`boost=${first.id}`);
    renderWithClient(<ListingsView />);
    const dialog = await screen.findByRole("dialog", { name: "โปรโมต 1 ประกาศ" });
    await user.click(within(dialog).getByRole("radio", { name: /ปักหมุดหน้าแรก/ }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("เครดิตคงเหลือ ฿1,250 ไม่พอ");
    expect(within(dialog).queryByRole("button", { name: "เริ่มโปรโมต" })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "ไปชำระเงิน" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(expect.stringMatching(/^\/checkout\/o-/)));
  });

  it("closes listings after confirming", async () => {
    const user = userEvent.setup();
    setSearchParams("status=expired");
    renderWithClient(<ListingsView />);
    const table = await screen.findByRole("table", { name: "ประกาศของฉัน" });
    await user.click(within(table).getByRole("checkbox", { name: "เลือกทั้งหมดในหน้านี้" }));
    await user.click(
      within(screen.getByRole("region", { name: "การจัดการที่เลือก" })).getByRole("button", { name: "ปิดประกาศ" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "ปิด 5 ประกาศ?" });
    await user.click(within(dialog).getByRole("button", { name: "ปิดประกาศ" }));
    expect(await screen.findByText("ปิดประกาศแล้ว 5 ประกาศ")).toBeInTheDocument();
    expect(listSellerListings(me(), {}).counts.expired).toBe(0);
  });
});

describe("LeadsView (C10)", () => {
  beforeEach(() => resetMockSession({ signedIn: true }));
  const pending = () => listAppointments(me()).filter((a) => a.role === "lister" && a.status === "requested");

  it("lists requests soonest expiry first and flags a clash", async () => {
    renderWithClient(<LeadsView />);
    const requests = await screen.findAllByRole("article", { name: /^คำขอจาก/ });
    expect(requests.map((r) => r.getAttribute("aria-label"))).toEqual([
      "คำขอจาก ศิริพร มีสุข",
      "คำขอจาก ธีรภัทร วงศ์ใหญ่",
      "คำขอจาก พิมพ์ชนก แสงทอง",
    ]);
    const clash = requests[2];
    expect(within(clash).getByText("ชนกับนัดที่ยืนยันแล้ว")).toBeInTheDocument();
    expect(within(clash).getByRole("button", { name: /^ยืนยัน ส\./ })).toBeDisabled();
    expect(screen.getByRole("heading", { name: /^ตารางนัด/ })).toBeInTheDocument();
    expect(await screen.findByText("17:00 ถึง 20:00")).toBeInTheDocument();
  });

  it("confirms the backup time and declines", async () => {
    const user = userEvent.setup();
    renderWithClient(<LeadsView />);
    const [first] = await screen.findAllByRole("article", { name: /^คำขอจาก/ });
    const backup = pending().find((a) => a.counterpart.name === "ศิริพร มีสุข")!.backupSlot;
    await user.click(within(first).getByRole("button", { name: "ยืนยันเวลาสำรอง" }));
    expect(await screen.findByText("ยืนยันนัดแล้ว")).toBeInTheDocument();
    await waitFor(() => expect(pending()).toHaveLength(2));
    const confirmed = listAppointments(me()).find((a) => a.counterpart.name === "ศิริพร มีสุข")!;
    expect(confirmed).toMatchObject({ status: "confirmed", slot: backup });

    const second = await screen.findByRole("article", { name: "คำขอจาก ธีรภัทร วงศ์ใหญ่" });
    await user.click(within(second).getByRole("button", { name: /^ปฏิเสธ/ }));
    await waitFor(() => expect(pending()).toHaveLength(1));
  });

  it("proposes another time", async () => {
    const user = userEvent.setup();
    renderWithClient(<LeadsView />);
    const card = await screen.findByRole("article", { name: "คำขอจาก ธีรภัทร วงศ์ใหญ่" });
    await user.click(within(card).getByRole("button", { name: "เสนอเวลาอื่น" }));
    const dialog = await screen.findByRole("dialog", { name: /เสนอเวลาอื่นให้ ธีรภัทร/ });
    const times = within(await within(dialog).findByRole("group", { name: /^เวลาว่าง/ })).getAllByRole("button");
    await user.click(times.find((b) => !(b as HTMLButtonElement).disabled)!);
    await user.click(within(dialog).getByRole("button", { name: /^เสนอ / }));
    expect(await screen.findByText("ส่งเวลาใหม่ให้ผู้สนใจแล้ว")).toBeInTheDocument();
    await waitFor(() =>
      expect(listAppointments(me()).find((a) => a.counterpart.name === "ธีรภัทร วงศ์ใหญ่")?.status).toBe(
        "counter_proposed",
      ),
    );
  });

  it("lists every lead with a chat link", async () => {
    const user = userEvent.setup();
    renderWithClient(<LeadsView />);
    await user.click(await screen.findByRole("tab", { name: /ผู้สนใจทั้งหมด/ }));
    const list = await screen.findByRole("list", { name: "ผู้สนใจทั้งหมด" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(23);
    expect(within(list).getAllByRole("link", { name: /^เปิดแชต/ })).toHaveLength(8);
  });
});

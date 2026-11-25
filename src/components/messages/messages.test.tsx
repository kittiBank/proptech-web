import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentsView } from "@/components/account/appointments-view";
import { getThread, listAppointments, unreadMessageCount } from "@/mocks/inbox";
import { resetMockSession } from "@/mocks/session";
import { router, setParams, setSearchParams } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import { MessagesIndex } from "./messages-index";
import { MessagesShell } from "./messages-shell";
import { ThreadList } from "./thread-list";
import { ThreadView } from "./thread-view";

vi.setConfig({ testTimeout: 20_000 });
const U = "u-1";

beforeEach(() => resetMockSession({ signedIn: true }));

function openThread(id: string) {
  setParams({ threadId: id });
  return renderWithClient(<ThreadView />);
}

describe("ThreadList (B14, B15)", () => {
  it("lists chats newest first and filters unread", async () => {
    const user = userEvent.setup();
    renderWithClient(<ThreadList />);
    const list = await screen.findByRole("list", { name: "รายการแชต" });
    // 5 chats as a buyer plus 8 about the demo lister's own listings.
    expect(within(list).getAllByRole("link")).toHaveLength(13);
    expect(within(list).getAllByText("ข้อความใหม่")).toHaveLength(2);

    await user.click(await screen.findByRole("radio", { name: /ยังไม่อ่าน 2/ }));
    await waitFor(() =>
      expect(within(screen.getByRole("list", { name: "รายการแชต" })).getAllByRole("link")).toHaveLength(2),
    );
  });
});

describe("MessagesShell", () => {
  it("asks signed-out visitors to log in", async () => {
    resetMockSession();
    setParams({});
    renderWithClient(<MessagesShell>chat</MessagesShell>);
    expect(await screen.findByRole("heading", { name: "เข้าสู่ระบบเพื่อดูข้อความ" })).toBeInTheDocument();
  });
});

describe("MessagesIndex", () => {
  it("opens or starts the chat named in ?to=", async () => {
    setSearchParams("to=agent:anan-thongdee");
    renderWithClient(<MessagesIndex />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(expect.stringMatching(/^\/messages\/t-/)));
  });
});

describe("ThreadView (B14, B16)", () => {
  it("marks the chat read, shows the scam warning and the confirmed viewing", async () => {
    openThread("t-1");
    expect(await screen.findByRole("region", { name: /แชตกับ กิตติพัฒน์ ศรีสุข/ })).toBeInTheDocument();
    expect(screen.getByText(/ไม่เรียกเก็บเงินมัดจำแทนผู้ลงประกาศ/)).toBeInTheDocument();
    const card = screen.getByRole("article", { name: /คำขอนัดดูทรัพย์/ });
    expect(within(card).getByText("ยืนยันแล้ว")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "เพิ่มลงปฏิทิน" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^data:text\/calendar/),
    );
    await waitFor(() => expect(unreadMessageCount(U)).toBe(1));
  });

  it("sends with Enter and with a quick reply", async () => {
    const user = userEvent.setup();
    openThread("t-3");
    const box = await screen.findByLabelText("พิมพ์ข้อความ");
    await user.type(box, "ยังว่างอยู่ไหมคะ{Enter}");
    expect(await screen.findByText("ยังว่างอยู่ไหมคะ")).toBeInTheDocument();
    expect(box).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "ต่อรองราคาได้ไหม" }));
    await waitFor(() => expect(getThread(U, "t-3")!.messages.at(-1)?.text).toBe("ต่อรองราคาได้ไหม"));
  });

  it("requests a viewing with a backup time and party size (B18)", async () => {
    const user = userEvent.setup();
    openThread("t-3");
    await user.click(await screen.findByRole("button", { name: "ขอนัดดูห้อง" }));
    const dialog = await screen.findByRole("dialog", { name: "ขอนัดดูห้อง" });
    const times = await within(dialog).findByRole("group", { name: /^เวลาว่าง/ });
    const free = within(times)
      .getAllByRole("button")
      .filter((b) => !(b as HTMLButtonElement).disabled);
    await user.click(free[0]);
    await user.click(within(dialog).getByRole("button", { name: "เพิ่ม" }));
    await user.click(free[1]);
    expect(free[1]).toHaveAccessibleName(/เวลาสำรอง/);
    await user.click(within(dialog).getByRole("button", { name: "เพิ่มจำนวนผู้เข้าชม" }));
    await user.type(within(dialog).getByLabelText(/ข้อความถึงผู้ลงประกาศ/), "ขอดูส่วนกลางด้วยค่ะ");
    await user.click(within(dialog).getByRole("button", { name: /^ส่งคำขอนัด/ }));

    expect(await screen.findByText("ส่งคำขอนัดแล้ว ผู้ลงประกาศจะยืนยันในแชต")).toBeInTheDocument();
    const viewing = getThread(U, "t-3")!.viewings.find((v) => v.status === "requested")!;
    expect(viewing).toMatchObject({ partySize: 3, note: "ขอดูส่วนกลางด้วยค่ะ" });
    expect(viewing.backupSlot).toBeDefined();
  });

  it("lets the buyer cancel a pending request and then ask again", async () => {
    const user = userEvent.setup();
    openThread("t-2");
    await screen.findByRole("region", { name: /แชตกับ/ });
    expect(screen.queryByRole("button", { name: "ขอนัดดูห้อง" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "ยกเลิกคำขอ" }));
    expect(await screen.findByRole("button", { name: "ขอนัดใหม่" })).toBeInTheDocument();
    expect(getThread(U, "t-2")!.viewings[0].status).toBe("cancelled");
  });

  it("accepts a counter-proposed time", async () => {
    const user = userEvent.setup();
    const pending = getThread(U, "t-2")!.viewings[0];
    Object.assign(pending, {
      status: "counter_proposed",
      proposedSlot: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    });
    openThread("t-2");
    await user.click(await screen.findByRole("button", { name: "รับเวลาใหม่" }));
    await waitFor(() => expect(getThread(U, "t-2")!.viewings[0].status).toBe("confirmed"));
  });
});

describe("AppointmentsView (B17)", () => {
  it("sorts viewings into tabs and cancels a pending request", async () => {
    const user = userEvent.setup();
    renderWithClient(<AppointmentsView />);
    expect(await screen.findByRole("tab", { name: /กำลังจะถึง\s*2/ })).toHaveAttribute("aria-selected", "true");
    const upcoming = screen.getByRole("tabpanel");
    expect(within(upcoming).getAllByRole("article")).toHaveLength(2);

    await user.click(screen.getByRole("tab", { name: /รอยืนยัน/ }));
    await user.click(await screen.findByRole("button", { name: "ยกเลิกคำขอ" }));
    await waitFor(() => expect(listAppointments(U).filter((a) => a.status === "cancelled")).toHaveLength(1));

    await user.click(screen.getByRole("tab", { name: "ที่ผ่านมา" }));
    expect(within(screen.getByRole("tabpanel")).getAllByRole("article")).toHaveLength(2);
  });
});

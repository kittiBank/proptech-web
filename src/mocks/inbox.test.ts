import { describe, expect, it } from "vitest";
import {
  addThread,
  createViewing,
  getThread,
  listAppointments,
  listThreads,
  markThreadRead,
  sendMessage,
  startThread,
  unreadMessageCount,
  updateViewing,
  viewingSlots,
} from "./inbox";

const U = "u-1";
const DAY = 86_400_000;
const future = (days: number) => new Date(Date.now() + days * DAY).toISOString();

describe("mock inbox", () => {
  it("seeds a demo inbox with two unread chats and viewings in every state", () => {
    const threads = listThreads(U);
    expect(threads.filter((t) => t.role === "buyer")).toHaveLength(5);
    // Buyers asking about the demo lister's own listings (seller dashboard).
    expect(threads.filter((t) => t.role === "lister")).toHaveLength(8);
    expect(unreadMessageCount(U)).toBe(2);
    expect(listThreads(U, "unread")).toHaveLength(2);
    const statuses = (role: "buyer" | "lister") =>
      listAppointments(U)
        .filter((a) => a.role === role)
        .map((a) => a.status)
        .sort();
    expect(statuses("buyer")).toEqual(["completed", "confirmed", "confirmed", "expired", "requested"]);
    expect(statuses("lister")).toEqual([
      "completed",
      "confirmed",
      "confirmed",
      "confirmed",
      "confirmed",
      "requested",
      "requested",
      "requested",
    ]);
  });

  it("lets the lister confirm the backup time, decline or propose another", () => {
    const pending = listAppointments(U).filter((a) => a.role === "lister" && a.status === "requested");
    const withBackup = pending.find((a) => a.backupSlot)!;
    const backup = withBackup.backupSlot!;
    expect(updateViewing(U, withBackup.id, { action: "confirm", slot: future(9) })).toBe("invalid");
    const confirmed = updateViewing(U, withBackup.id, { action: "confirm", slot: backup });
    expect(confirmed).toMatchObject({ status: "confirmed", slot: backup, backupSlot: undefined });

    const [next, last] = pending.filter((a) => a.id !== withBackup.id);
    expect(updateViewing(U, next.id, { action: "propose", slot: future(2) })).toMatchObject({
      status: "counter_proposed",
    });
    expect(updateViewing(U, last.id, { action: "decline" })).toMatchObject({ status: "declined" });
    // Buyer-only actions stay closed to the lister.
    expect(updateViewing(U, next.id, { action: "accept" })).toBe("forbidden");
  });

  it("reads, sends and reopens threads", () => {
    const [first] = listThreads(U, "unread");
    markThreadRead(U, first.id);
    expect(unreadMessageCount(U)).toBe(1);
    sendMessage(U, first.id, "สวัสดีค่ะ");
    expect(getThread(U, first.id)!.messages.at(-1)).toMatchObject({ from: "me", text: "สวัสดีค่ะ" });

    const agent = startThread(U, "agent:anan-thongdee")!;
    expect(agent.counterpart).toMatchObject({ name: "อนันต์ ทองดี", profileSlug: "anan-thongdee" });
    expect(agent.listing).toBeUndefined();
    expect(startThread(U, "agent:anan-thongdee")!.id).toBe(agent.id);
    expect(startThread(U, "agent:nobody")).toBeUndefined();
  });

  it("enforces the viewing request rules", () => {
    const threads = listThreads(U);
    const pending = threads.find((t) => t.viewing?.status === "requested")!;
    expect(createViewing(U, pending.id, { slot: future(3), partySize: 2 })).toBe("conflict");

    const confirmed = threads.find((t) => t.viewing?.status === "confirmed" && t.listing?.kind === "property")!;
    expect(createViewing(U, confirmed.id, { slot: future(-1), partySize: 2 })).toBe("invalid");
    expect(createViewing(U, confirmed.id, { slot: future(3), partySize: 0 })).toBe("invalid");
    const created = createViewing(U, confirmed.id, { slot: future(3), backupSlot: future(4), partySize: 3 });
    expect(created).toMatchObject({ status: "requested", partySize: 3 });

    const agentOnly = startThread(U, "agent:anan-thongdee")!;
    expect(createViewing(U, agentOnly.id, { slot: future(3), partySize: 1 })).toBe("forbidden");

    const lister = addThread(U, {
      key: "lead:1",
      role: "lister",
      counterpart: { name: "ผู้สนใจ", kind: "owner", phone: "0", idVerified: false, responseMinutes: 60 },
      listing: confirmed.listing,
      unreadCount: 0,
    });
    expect(createViewing(U, lister, { slot: future(3), partySize: 1 })).toBe("forbidden");
  });

  it("lets the buyer cancel and accept a counter-proposal", () => {
    const pending = listThreads(U).find((t) => t.viewing?.status === "requested")!;
    const id = pending.viewing!.id;
    expect(updateViewing(U, id, { action: "confirm" })).toBe("forbidden");
    expect(updateViewing(U, id, { action: "accept" })).toBe("conflict");
    expect(updateViewing(U, id, { action: "cancel" })).toMatchObject({ status: "cancelled" });
  });

  it("offers bookable hours for the next 7 days, skipping lunch", () => {
    const thread = listThreads(U).find((t) => t.listing?.kind === "property")!;
    const slots = viewingSlots(U, thread.id)!;
    expect(slots.days).toHaveLength(7);
    expect(slots.days[0].slots.map((s) => s.time)).not.toContain("12:00");
    expect(slots.days.flatMap((d) => d.slots).some((s) => !s.available)).toBe(true);
  });
});

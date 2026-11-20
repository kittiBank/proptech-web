import { describe, expect, it } from "vitest";
import {
  appointmentTab,
  dayBox,
  effectiveStatus,
  expiryFor,
  formatSlot,
  slotIso,
  slotParts,
  viewingIcs,
} from "./viewing";

describe("slots in Bangkok time", () => {
  it("round-trips a date and time", () => {
    const iso = slotIso("2026-11-22", "10:00");
    expect(iso).toBe("2026-11-22T03:00:00.000Z");
    expect(slotParts(iso)).toEqual({ date: "2026-11-22", time: "10:00" });
  });

  it("formats long and short labels with the Buddhist year", () => {
    const iso = slotIso("2026-11-21", "10:00"); // a Saturday
    expect(formatSlot(iso)).toBe("เสาร์ 21 พ.ย. 2569 10:00");
    expect(formatSlot(iso, "short")).toBe("ส. 21 พ.ย. 10:00");
    expect(dayBox(iso)).toEqual({ weekday: "ส.", day: "21", month: "พ.ย." });
  });
});

describe("request lifecycle", () => {
  const created = "2026-11-20T03:00:00.000Z";
  const base = { slot: slotIso("2026-11-22", "10:00"), expiresAt: expiryFor(created) };

  it("expires an unanswered request after 24 hours", () => {
    expect(base.expiresAt).toBe("2026-11-21T03:00:00.000Z");
    expect(effectiveStatus({ ...base, status: "requested" }, Date.parse("2026-11-21T02:59:00Z"))).toBe("requested");
    expect(effectiveStatus({ ...base, status: "requested" }, Date.parse("2026-11-21T03:00:00Z"))).toBe("expired");
  });

  it("completes a confirmed viewing an hour after it starts", () => {
    expect(effectiveStatus({ ...base, status: "confirmed" }, Date.parse("2026-11-22T03:30:00Z"))).toBe("confirmed");
    expect(effectiveStatus({ ...base, status: "confirmed" }, Date.parse("2026-11-22T04:00:00Z"))).toBe("completed");
  });

  it("sorts statuses into the appointments tabs", () => {
    expect(appointmentTab("confirmed")).toBe("upcoming");
    expect(appointmentTab("counter_proposed")).toBe("pending");
    expect(appointmentTab("expired")).toBe("past");
    expect(appointmentTab("cancelled")).toBe("cancelled");
  });
});

describe("viewingIcs", () => {
  it("builds a one-hour event with escaped text", () => {
    const ics = viewingIcs({
      id: "v-1",
      slot: "2026-11-22T03:00:00.000Z",
      title: "ดูห้อง, ชั้น 12",
      location: "ล็อบบี้",
    });
    expect(ics).toContain("DTSTART:20261122T030000Z");
    expect(ics).toContain("DTEND:20261122T040000Z");
    expect(ics).toContain("SUMMARY:ดูห้อง\\, ชั้น 12");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});

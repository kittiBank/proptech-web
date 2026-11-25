import { describe, expect, it } from "vitest";
import type { AppointmentDto, SellerListingDto } from "@/types/api";
import {
  boostHref,
  calendarEntries,
  clashesWithConfirmed,
  coverage,
  defaultListingsState,
  formatCountdown,
  listingsCsv,
  parseListingsParams,
  promotionNote,
  shiftWeek,
  toListingsApiQuery,
  toListingsQueryString,
  updateListingsState,
  weekDays,
  weekRangeLabel,
  weekStart,
  weekdayLabel,
} from "./seller";

const NOW = Date.parse("2026-11-25T03:00:00Z"); // Wed 25 Nov 2026, 10:00 Bangkok
const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString();

const listing = (over: Partial<SellerListingDto> = {}): SellerListingDto => ({
  id: "sl-1",
  code: "PH-1008",
  title: "2 ห้องนอน ใกล้ EmQuartier",
  mode: "buy",
  price: 9_200_000,
  status: "published",
  views7d: 1284,
  leads: 11,
  contactRate: 0.0086,
  updatedAt: iso(-1),
  ...over,
});

describe("listings URL state", () => {
  it("reads only known values and keeps defaults out of the query string", () => {
    const state = parseListingsParams(
      new URLSearchParams("status=rejected&q=%20EmQuartier%20&mode=sell&sort=-leads&page=3&boost=a,b,,c"),
    );
    expect(state).toEqual({
      status: "rejected",
      q: "EmQuartier",
      mode: "all",
      sort: "-leads",
      page: 3,
      boost: ["a", "b", "c"],
    });
    expect(toListingsQueryString(defaultListingsState)).toBe("");
    expect(toListingsQueryString(state)).toBe("status=rejected&q=EmQuartier&sort=-leads&page=3&boost=a,b,c");
  });

  it("goes back to page 1 on a filter change, but not when opening the boost dialog", () => {
    const onPage3 = { ...defaultListingsState, page: 3 };
    expect(updateListingsState(onPage3, { status: "draft" }).page).toBe(1);
    expect(updateListingsState(onPage3, { boost: ["x"] }).page).toBe(3);
    expect(updateListingsState(onPage3, { page: 4 }).page).toBe(4);
  });

  it("maps to the API query", () => {
    expect(toListingsApiQuery({ ...defaultListingsState, mode: "rent", q: "" }, 10)).toEqual({
      status: "all",
      q: undefined,
      mode: "rent",
      sort: "-views",
      page: 1,
      limit: 10,
    });
    expect(boostHref(["sl-1", "sl-2"])).toBe("/dashboard/listings?boost=sl-1,sl-2");
  });
});

describe("boosts", () => {
  it("lets the package cover what it can and charges the rest", () => {
    expect(coverage({ price: 590, packageLeft: 2 }, 2)).toEqual({ covered: 2, charge: 0, fullPrice: 1180 });
    expect(coverage({ price: 590, packageLeft: 1 }, 3)).toEqual({ covered: 1, charge: 1180, fullPrice: 1770 });
    expect(coverage({ price: 1490 }, 2)).toEqual({ covered: 0, charge: 2980, fullPrice: 2980 });
  });

  it("describes the promotion column", () => {
    expect(promotionNote(listing({ promotion: { kind: "featured", endsAt: iso(12) } }), NOW)).toEqual({
      text: "แนะนำ เหลือ 12 วัน",
      tone: "violet",
    });
    expect(promotionNote(listing({ expiresAt: iso(2.5) }), NOW)).toEqual({ text: "หมดอายุใน 3 วัน", tone: "warning" });
    expect(promotionNote(listing({ expiresAt: iso(30), lastBumpedAt: "2026-11-25T01:00:00Z" }), NOW)?.text).toBe(
      "ดันล่าสุด 08:00",
    );
    expect(promotionNote(listing({ status: "rejected", rejectReason: "รูปมีลายน้ำ" }), NOW)?.tone).toBe("danger");
    expect(promotionNote(listing({ status: "draft", draftProgress: 2 }), NOW)?.text).toBe("ถึงขั้นที่ 3 จาก 5");
  });

  it("counts down in hours, then days", () => {
    expect(formatCountdown(new Date(NOW + 4.2 * 3_600_000).toISOString(), NOW)).toBe("5 ชม.");
    expect(formatCountdown(iso(1.5), NOW)).toBe("2 วัน");
    expect(formatCountdown(iso(-1), NOW)).toBe("หมดเวลาแล้ว");
  });
});

describe("weekly calendar", () => {
  it("starts weeks on Monday in Bangkok time", () => {
    expect(weekStart("2026-11-25T03:00:00Z")).toBe("2026-11-23");
    // Sunday 23:30 Bangkok is still the week before.
    expect(weekStart("2026-11-29T16:30:00Z")).toBe("2026-11-23");
    expect(weekStart("2026-11-29T17:30:00Z")).toBe("2026-11-30");
    expect(weekDays("2026-11-23")).toHaveLength(7);
    expect(shiftWeek("2026-11-23", 1)).toBe("2026-11-30");
    expect(weekdayLabel("2026-11-23")).toBe("จ. 23");
    expect(weekRangeLabel("2026-11-23")).toBe("23 ถึง 29 พ.ย.");
  });

  const viewing = (
    id: string,
    slot: string,
    status: AppointmentDto["status"],
    role: AppointmentDto["role"] = "lister",
  ) =>
    ({
      id,
      threadId: `t-${id}`,
      slot,
      partySize: 1,
      status,
      createdAt: slot,
      expiresAt: slot,
      role,
      counterpart: { name: "ผู้สนใจ", kind: "buyer", phone: "", idVerified: false, responseMinutes: 0 },
    }) satisfies AppointmentDto;

  it("places confirmed and pending lister viewings on their day", () => {
    const sat10 = "2026-11-28T03:00:00Z";
    const entries = calendarEntries(
      [
        viewing("a", "2026-11-28T07:00:00Z", "confirmed"),
        viewing("b", sat10, "requested"),
        viewing("c", sat10, "declined"),
        viewing("d", sat10, "confirmed", "buyer"),
      ],
      "2026-11-23",
    );
    const saturday = entries.find((d) => d.date === "2026-11-28")!;
    expect(saturday.items.map((v) => v.id)).toEqual(["b", "a"]);
    expect(entries.flatMap((d) => d.items)).toHaveLength(2);
  });

  it("flags a request whose time is already taken", () => {
    const confirmed = viewing("a", "2026-11-28T03:00:00Z", "confirmed");
    const request = viewing("b", "2026-11-28T03:00:00Z", "requested");
    expect(clashesWithConfirmed(request, [confirmed, request])).toBe(true);
    expect(clashesWithConfirmed({ ...request, slot: "2026-11-28T08:00:00Z" }, [confirmed])).toBe(false);
  });
});

describe("listingsCsv", () => {
  it("writes a header, quotes commas and starts with a BOM", () => {
    const csv = listingsCsv([listing({ title: 'คอนโด "วิวเมือง", ชั้นสูง', expiresAt: "2026-12-25T05:00:00Z" })]);
    expect(csv.startsWith("﻿รหัส,ชื่อประกาศ")).toBe(true);
    expect(csv.split("\r\n")[1]).toBe(
      'PH-1008,"คอนโด ""วิวเมือง"", ชั้นสูง",ขาย,เผยแพร่แล้ว,9200000,1284,11,2026-12-25',
    );
  });
});

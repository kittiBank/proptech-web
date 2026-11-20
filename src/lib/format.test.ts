import { describe, expect, it } from "vitest";
import { formatListingPrice, formatPrice, formatRelativeDays, formatShortStamp, formatTimeAgo } from "./format";

describe("formatPrice", () => {
  it("shows millions with up to two decimals", () => {
    expect(formatPrice(6_900_000)).toBe("6.9 ล้าน");
    expect(formatPrice(12_345_000)).toBe("12.35 ล้าน");
  });

  it("rounds to whole millions from 100 million up", () => {
    expect(formatPrice(125_400_000)).toBe("125 ล้าน");
  });

  it("keeps amounts under a million as grouped digits", () => {
    expect(formatPrice(25_000)).toBe("25,000");
  });
});

describe("formatListingPrice", () => {
  it("adds a per-month suffix for rentals only", () => {
    expect(formatListingPrice(25_000, "rent")).toBe("฿25,000/เดือน");
    expect(formatListingPrice(3_500_000, "buy")).toBe("฿3.5 ล้าน");
  });
});

describe("formatRelativeDays", () => {
  const now = new Date("2026-11-10");

  it.each([
    ["2026-11-10", "วันนี้"],
    ["2026-11-09", "เมื่อวาน"],
    ["2026-11-06", "4 วันที่แล้ว"],
    ["2026-10-27", "2 สัปดาห์ที่แล้ว"],
    ["2026-11-12", "วันนี้"], // future dates clamp to today
  ])("%s → %s", (date, expected) => {
    expect(formatRelativeDays(date, now)).toBe(expected);
  });
});

describe("formatTimeAgo", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  it("picks the largest sensible unit", () => {
    expect(formatTimeAgo("2026-11-20T11:59:40Z", now)).toBe("เมื่อสักครู่");
    expect(formatTimeAgo("2026-11-20T11:55:00Z", now)).toBe("5 นาทีที่แล้ว");
    expect(formatTimeAgo("2026-11-20T09:00:00Z", now)).toBe("3 ชั่วโมงที่แล้ว");
    expect(formatTimeAgo("2026-11-19T10:00:00Z", now)).toBe("เมื่อวาน");
    expect(formatTimeAgo("2026-08-20T09:00:00Z", now)).toBe("3 เดือนที่แล้ว");
    expect(formatTimeAgo("2025-10-01T09:00:00Z", now)).toBe("1 ปีที่แล้ว");
  });
});

describe("formatShortStamp", () => {
  const now = new Date("2026-11-20T05:00:00Z"); // 12:00 in Bangkok
  it("shows a clock today, เมื่อวาน, then the date", () => {
    expect(formatShortStamp("2026-11-20T03:51:00Z", now)).toBe("10:51");
    expect(formatShortStamp("2026-11-19T03:00:00Z", now)).toBe("เมื่อวาน");
    expect(formatShortStamp("2026-11-14T03:00:00Z", now)).toBe("14 พ.ย.");
  });
});

import { describe, expect, it } from "vitest";
import type { ModerationItemDto, ReportCaseDto } from "@/types/api";
import {
  compareModeration,
  compareReports,
  faceMatchLabel,
  formatSubmitted,
  formatWait,
  listingOverSla,
  reportOverSla,
} from "./admin-queues";

const MIN = 60_000;
const NOW = Date.parse("2026-11-26T12:00:00Z");
const ago = (minutes: number) => new Date(NOW - minutes * MIN).toISOString();

describe("admin queues", () => {
  it("formats how long something has waited", () => {
    expect(formatWait(22 * MIN)).toBe("22 นาที");
    expect(formatWait(72 * MIN)).toBe("1 ชม. 12 น.");
    expect(formatWait(125 * MIN)).toBe("2 ชม. 05 น.");
    expect(formatWait(180 * MIN)).toBe("3 ชม.");
    expect(formatWait(50 * 60 * MIN)).toBe("2 วัน");
    expect(formatWait(-5)).toBe("0 นาที");
  });

  it("formats the submitted date in Bangkok time", () => {
    expect(formatSubmitted("2026-11-26T05:33:00Z")).toBe("26/11/2569: 12:33 น.");
    expect(formatSubmitted("2026-01-03T16:05:00Z")).toBe("03/01/2569: 23:05 น.");
  });

  it("knows when the SLA is broken", () => {
    expect(listingOverSla(ago(119), NOW)).toBe(false);
    expect(listingOverSla(ago(121), NOW)).toBe(true);
    expect(reportOverSla({ severity: "high", openedAt: ago(4 * 60 + 1) }, NOW)).toBe(true);
    expect(reportOverSla({ severity: "low", openedAt: ago(4 * 60 + 1) }, NOW)).toBe(false);
  });

  it("puts paid listings first, then the longest wait", () => {
    const item = (id: string, minutes: number, paid = false) =>
      ({
        id,
        submittedAt: ago(minutes),
        promotion: paid ? { label: "แนะนำ", amount: 590 } : undefined,
      }) as ModerationItemDto;
    const list = [item("a", 10), item("b", 90), item("c", 5, true)];
    expect([...list].sort(compareModeration("paid_first")).map((i) => i.id)).toEqual(["c", "b", "a"]);
    expect([...list].sort(compareModeration("oldest")).map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect([...list].sort(compareModeration("newest")).map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("orders reports by severity, then age", () => {
    const c = (id: string, severity: ReportCaseDto["severity"], minutes: number) =>
      ({ id, severity, openedAt: ago(minutes) }) as ReportCaseDto;
    const list = [c("low", "low", 999), c("high-new", "high", 5), c("high-old", "high", 60), c("mid", "medium", 300)];
    expect([...list].sort(compareReports).map((x) => x.id)).toEqual(["high-old", "high-new", "mid", "low"]);
  });

  it("labels the face match", () => {
    expect(faceMatchLabel(0.94)).toEqual({ text: "ตรง 0.94", tone: "success" });
    expect(faceMatchLabel(0.85).tone).toBe("warning");
    expect(faceMatchLabel(0.5).tone).toBe("danger");
  });
});

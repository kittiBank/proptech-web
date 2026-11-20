import { describe, expect, it } from "vitest";
import { listingStatuses, reportTone, viewingStatuses } from "./status";

describe("domain statuses", () => {
  it("maps listing and viewing statuses to the tones in the handoff", () => {
    expect(listingStatuses.pending_review.tone).toBe("warning");
    expect(listingStatuses.published.tone).toBe("success");
    expect(listingStatuses.rejected.tone).toBe("danger");
    expect(viewingStatuses.confirmed).toEqual({ label: "ยืนยันแล้ว", tone: "success" });
    expect(viewingStatuses.counter_proposed.tone).toBe("warning");
  });

  it("colours open reports by severity", () => {
    expect(reportTone("open", "high")).toBe("danger");
    expect(reportTone("open", "medium")).toBe("warning");
    expect(reportTone("open", "low")).toBe("neutral");
    expect(reportTone("resolved", "high")).toBe("success");
  });
});

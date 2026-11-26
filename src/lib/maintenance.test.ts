import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  formatMaintenanceWindow,
  isMaintenanceMode,
  maintenancePhase,
  maintenanceWindow,
  retryAfterSeconds,
} from "./maintenance";

const window = { startsAt: "2026-11-29T02:00:00+07:00", endsAt: "2026-11-29T04:00:00+07:00" };
const at = (iso: string) => Date.parse(iso);

describe("maintenance", () => {
  it("reads the window from env and falls back on missing or bad dates", () => {
    expect(
      maintenanceWindow({ MAINTENANCE_STARTS_AT: "2026-12-01T01:00:00Z", MAINTENANCE_ENDS_AT: "2026-12-01T02:00:00Z" }),
    ).toEqual({
      startsAt: "2026-12-01T01:00:00Z",
      endsAt: "2026-12-01T02:00:00Z",
    });
    expect(maintenanceWindow({ MAINTENANCE_STARTS_AT: "soon", MAINTENANCE_ENDS_AT: "later" })).toEqual(window);
    expect(maintenanceWindow({})).toEqual(window);
  });

  it("turns on only for MAINTENANCE_MODE=on", () => {
    expect(isMaintenanceMode({ MAINTENANCE_MODE: "on" })).toBe(true);
    expect(isMaintenanceMode({ MAINTENANCE_MODE: " ON " })).toBe(true);
    expect(isMaintenanceMode({ MAINTENANCE_MODE: "1" })).toBe(false);
    expect(isMaintenanceMode({})).toBe(false);
  });

  it("knows whether the window is upcoming, active or over", () => {
    expect(maintenancePhase(window, at("2026-11-29T01:59:00+07:00"))).toBe("upcoming");
    expect(maintenancePhase(window, at("2026-11-29T02:00:00+07:00"))).toBe("active");
    expect(maintenancePhase(window, at("2026-11-29T04:00:00+07:00"))).toBe("over");
  });

  it("formats the countdown, rounding minutes up", () => {
    expect(formatCountdown(84 * 60_000)).toBe("1 ชม. 24 นาที");
    expect(formatCountdown(83 * 60_000 + 1)).toBe("1 ชม. 24 นาที");
    expect(formatCountdown(2 * 3_600_000)).toBe("2 ชม.");
    expect(formatCountdown(5 * 60_000)).toBe("5 นาที");
    expect(formatCountdown((2 * 24 + 3) * 3_600_000)).toBe("2 วัน 3 ชม.");
    expect(formatCountdown(0)).toBe("ไม่ถึง 1 นาที");
  });

  it("sends Retry-After until the end, at least a minute", () => {
    expect(retryAfterSeconds(window, at("2026-11-29T03:00:00+07:00"))).toBe(3600);
    expect(retryAfterSeconds(window, at("2026-11-29T05:00:00+07:00"))).toBe(60);
  });

  it("describes the window in Bangkok time", () => {
    expect(formatMaintenanceWindow(window)).toBe("วันอาทิตย์ที่ 29 พ.ย. 02:00 ถึง 04:00 น.");
  });
});

import { describe, expect, it } from "vitest";
import { closedListingSummary, formatLandSize } from "./listing";

describe("formatLandSize", () => {
  it("converts square wah to rai, ngan and wah", () => {
    expect(formatLandSize(400)).toBe("1 ไร่");
    expect(formatLandSize(120)).toBe("1 งาน 20 ตร.ว.");
    expect(formatLandSize(1650)).toBe("4 ไร่ 50 ตร.ว.");
  });
});

describe("closedListingSummary", () => {
  it("lists rooms, area, project and the last price", () => {
    expect(
      closedListingSummary({
        type: "condo",
        bedrooms: 2,
        area: 70,
        projectName: "นอร์ธ พร้อมพงษ์",
        price: 9_100_000,
        mode: "buy",
      }),
    ).toBe("2 ห้องนอน 70 ตร.ม. นอร์ธ พร้อมพงษ์ ราคาล่าสุด ฿9.1 ล้าน");
  });

  it("says studio, skips rooms for land and drops a missing project", () => {
    expect(closedListingSummary({ type: "condo", bedrooms: 0, area: 28, price: 15_000, mode: "rent" })).toBe(
      "สตูดิโอ 28 ตร.ม. ราคาล่าสุด ฿15,000/เดือน",
    );
    expect(closedListingSummary({ type: "land", bedrooms: 0, area: 400, price: 20_000_000, mode: "buy" })).toBe(
      "400 ตร.ม. ราคาล่าสุด ฿20 ล้าน",
    );
  });
});

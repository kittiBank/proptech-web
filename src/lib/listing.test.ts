import { describe, expect, it } from "vitest";
import { formatLandSize } from "./listing";

describe("formatLandSize", () => {
  it("converts square wah to rai, ngan and wah", () => {
    expect(formatLandSize(400)).toBe("1 ไร่");
    expect(formatLandSize(120)).toBe("1 งาน 20 ตร.ว.");
    expect(formatLandSize(1650)).toBe("4 ไร่ 50 ตร.ว.");
  });
});

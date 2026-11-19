import { describe, expect, it } from "vitest";
import { cleanNumberText, parseNumberText } from "./number-field";

describe("cleanNumberText", () => {
  it("keeps a decimal point while typing when decimals are allowed", () => {
    expect(cleanNumberText("35.", { decimal: true })).toBe("35.");
    expect(cleanNumberText("35.5", { decimal: true })).toBe("35.5");
    expect(cleanNumberText("3.5.5", { decimal: true })).toBe("3.55");
  });

  it("drops stray characters instead of clearing the field", () => {
    expect(cleanNumberText("1a2")).toBe("12");
    expect(cleanNumberText("-3")).toBe("3");
    expect(cleanNumberText("35.5")).toBe("355");
  });

  it("reads Thai digits and groups thousands", () => {
    expect(cleanNumberText("๑๒๓๔๕๖๗", { grouped: true })).toBe("1,234,567");
    expect(cleanNumberText("6,900,0001", { grouped: true })).toBe("69,000,001");
  });
});

describe("parseNumberText", () => {
  it("is undefined while empty or just a dot", () => {
    expect(parseNumberText("")).toBeUndefined();
    expect(parseNumberText(".")).toBeUndefined();
    expect(parseNumberText("6,900,000")).toBe(6_900_000);
    expect(parseNumberText("35.")).toBe(35);
  });
});

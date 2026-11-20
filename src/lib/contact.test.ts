import { describe, expect, it } from "vitest";
import { lineHref, maskPhone, telHref } from "./contact";

describe("contact helpers", () => {
  it("masks the last two digits and builds tel/LINE links", () => {
    expect(maskPhone("02-000-1102")).toBe("02-000-11xx");
    expect(telHref("02-000-1102")).toBe("tel:020001102");
    expect(lineHref("kittipat.realty")).toBe("https://line.me/R/ti/p/~kittipat.realty");
  });
});

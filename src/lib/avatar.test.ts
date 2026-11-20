import { describe, expect, it } from "vitest";
import { avatarColour, avatarColours, nameInitial } from "./avatar";

describe("nameInitial", () => {
  it("skips honorifics and Thai leading vowels", () => {
    expect(nameInitial("คุณสมชาย ใจดี")).toBe("ส");
    expect(nameInitial("บริษัท พร็อพ จำกัด")).toBe("พ");
    expect(nameInitial("เกียรติ")).toBe("ก");
    expect(nameInitial("ไพลิน")).toBe("พ");
    expect(nameInitial("anna")).toBe("A");
    expect(nameInitial("  ")).toBe("?");
  });
});

describe("avatarColour", () => {
  it("is stable for a name and comes from the palette", () => {
    expect(avatarColour("สมชาย")).toBe(avatarColour("สมชาย"));
    expect(avatarColours).toContain(avatarColour("Anna"));
  });
});

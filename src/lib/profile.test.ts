import { describe, expect, it } from "vitest";
import type { ProfileDto } from "@/types/api";
import { formatThaiPhone, profileCompleteness } from "./profile";

const base: ProfileDto = {
  firstName: "สมหญิง",
  lastName: "ใจดี",
  email: "a@example.com",
  emailVerified: true,
  phone: "0812345678",
  phoneVerified: false,
  language: "th",
  linked: { line: false },
  devices: [],
  notifications: {} as ProfileDto["notifications"],
  marketingOptIn: false,
};

describe("profileCompleteness", () => {
  it("weights a verified phone most and suggests it first", () => {
    expect(profileCompleteness(base)).toEqual({
      percent: 40,
      next: { id: "phone", label: expect.stringContaining("ยืนยันเบอร์โทร"), cta: "ยืนยันเบอร์โทร" },
    });
    expect(profileCompleteness({ ...base, phoneVerified: true }).next?.id).toBe("avatar");
  });

  it("reaches 100% with nothing left to do", () => {
    expect(profileCompleteness({ ...base, phoneVerified: true, avatarUrl: "x", lineId: "y" })).toEqual({
      percent: 100,
      next: undefined,
    });
  });
});

describe("formatThaiPhone", () => {
  it("groups mobile and landline numbers", () => {
    expect(formatThaiPhone("0812345678")).toBe("081-234-5678");
    expect(formatThaiPhone("021234567")).toBe("02-123-4567");
    expect(formatThaiPhone("12")).toBe("12");
  });
});

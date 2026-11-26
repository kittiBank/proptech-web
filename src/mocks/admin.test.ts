import { describe, expect, it } from "vitest";
import { bangkokDay } from "@/lib/format";
import {
  adminDashboard,
  adminLogout,
  currentAdmin,
  inviteAdmin,
  listAuditLog,
  resetMockAdmin,
  startAdminLogin,
  verifyAdminCode,
} from "./admin";
import { DEMO_ADMIN } from "./constants";

const NOW = Date.parse("2026-11-26T11:20:00+07:00");
const MIN = 60_000;
const today = bangkokDay(new Date(NOW));

function signIn(now = NOW) {
  const start = startAdminLogin(DEMO_ADMIN.email, DEMO_ADMIN.password, now);
  if (!start.ok) throw new Error("login failed");
  return { start, result: verifyAdminCode(start.challengeId, DEMO_ADMIN.code, now) };
}

describe("mock admin auth", () => {
  it("needs the password, then the authenticator code, and logs the sign-in", () => {
    resetMockAdmin(NOW);
    expect(startAdminLogin(DEMO_ADMIN.email, "wrong", NOW).ok).toBe(false);
    expect(signIn().result).toMatchObject({ ok: true, admin: { name: "นภัส", role: "super_admin" } });
    expect(currentAdmin(NOW + MIN)?.email).toBe(DEMO_ADMIN.email);
    expect(listAuditLog(today)[0]).toMatchObject({ action: "เข้าสู่ระบบ", actor: { name: "นภัส" } });
  });

  it("locks the challenge after 5 wrong codes and expires it after 5 minutes", () => {
    resetMockAdmin(NOW);
    const start = startAdminLogin(DEMO_ADMIN.email, DEMO_ADMIN.password, NOW);
    if (!start.ok) throw new Error();
    for (let i = 4; i >= 1; i--) {
      expect(verifyAdminCode(start.challengeId, "000000", NOW)).toEqual({
        ok: false,
        reason: "wrong_code",
        attemptsLeft: i,
      });
    }
    expect(verifyAdminCode(start.challengeId, "000000", NOW)).toEqual({ ok: false, reason: "locked" });
    expect(verifyAdminCode(start.challengeId, DEMO_ADMIN.code, NOW)).toEqual({ ok: false, reason: "locked" });

    const again = startAdminLogin(DEMO_ADMIN.email, DEMO_ADMIN.password, NOW);
    if (!again.ok) throw new Error();
    expect(verifyAdminCode(again.challengeId, DEMO_ADMIN.code, NOW + 6 * MIN)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("signs out after 30 idle minutes, but activity keeps the session alive", () => {
    resetMockAdmin(NOW);
    signIn();
    expect(currentAdmin(NOW + 25 * MIN)).not.toBeNull();
    expect(currentAdmin(NOW + 50 * MIN)).not.toBeNull();
    expect(currentAdmin(NOW + 81 * MIN)).toBeNull();
  });

  it("logs sign-out and invites; refuses duplicate invites", () => {
    resetMockAdmin(NOW);
    const { result } = signIn();
    if (!result.ok) throw new Error();
    expect(inviteAdmin(result.admin, "new@propertyhub.co.th", "editor", NOW).ok).toBe(true);
    expect(inviteAdmin(result.admin, "NEW@propertyhub.co.th", "editor", NOW)).toEqual({ ok: false, reason: "exists" });
    adminLogout(NOW + MIN);
    expect(
      listAuditLog(today)
        .map((e) => e.action)
        .slice(0, 2),
    ).toEqual(["ออกจากระบบ", "เชิญ new@propertyhub.co.th เป็น Editor"]);
    expect(currentAdmin(NOW + MIN)).toBeNull();
  });
});

describe("mock admin dashboard", () => {
  it("fills today's hours up to now and averages for the rest", () => {
    const { hourly } = adminDashboard(NOW);
    expect(hourly).toHaveLength(24);
    expect(hourly[11].count).not.toBeNull();
    expect(hourly[12].count).toBeNull();
  });

  it("seeds only audit entries that already happened today", () => {
    resetMockAdmin(Date.parse("2026-11-26T10:45:00+07:00"));
    expect(listAuditLog(today).map((e) => e.action)).toEqual([
      "อนุมัติคืนเงิน PAY-76941 ฿590",
      "เพิ่มสิทธิ์ Moderator ให้ ภูมิ",
    ]);
  });
});

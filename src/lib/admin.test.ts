import { describe, expect, it } from "vitest";
import { adminRewrite, adminRoutes, auditLogCsv, canOpen, normalizeTotp, safeAdminNext, sectionOf } from "./admin";

describe("admin", () => {
  it("builds paths under /admin by default", () => {
    expect(adminRoutes.dashboard).toBe("/admin");
    expect(adminRoutes.roles).toBe("/admin/settings/roles");
    expect(adminRoutes.login("/admin/kyc")).toBe("/admin/login?next=%2Fadmin%2Fkyc");
  });

  it("grants areas by role", () => {
    expect(canOpen("super_admin", "roles")).toBe(true);
    expect(canOpen("moderator", "roles")).toBe(false);
    expect(canOpen("kyc_reviewer", "kyc")).toBe(true);
    expect(canOpen("editor", "revenue")).toBe(false);
    expect(canOpen("finance", "dashboard")).toBe(true);
  });

  it("maps a path to its area", () => {
    expect(sectionOf("/admin")).toBe("dashboard");
    expect(sectionOf("/admin/settings/roles")).toBe("roles");
    expect(sectionOf("/admin/moderation/PH-1")).toBe("moderation");
    expect(sectionOf("/admin/promo-slots")).toBe("promo-slots");
  });

  it("only follows admin paths after login", () => {
    expect(safeAdminNext("/admin/kyc")).toBe("/admin/kyc");
    expect(safeAdminNext("/account")).toBe("/admin");
    expect(safeAdminNext("//evil.example")).toBe("/admin");
    expect(safeAdminNext("/admin/login?next=x")).toBe("/admin");
    expect(safeAdminNext(null)).toBe("/admin");
  });

  it("keeps the 6 digits of a pasted code", () => {
    expect(normalizeTotp("246 810")).toBe("246810");
    expect(normalizeTotp("12a3456789")).toBe("123456");
  });

  it("exports the audit log as CSV in Bangkok time", () => {
    const csv = auditLogCsv("2026-11-26", [
      {
        id: "AU-1",
        at: "2026-11-26T04:08:00Z",
        actor: { name: "นภัส", role: "super_admin" },
        action: "ระงับบัญชี user_88213",
        note: "RP-5521, ด่วน",
      },
    ]);
    expect(csv.split("\r\n")[1]).toBe('2026-11-26,11:08,นภัส,Super admin,ระงับบัญชี user_88213,"RP-5521, ด่วน",AU-1');
  });

  it("maps the admin subdomain onto /admin and hides /admin elsewhere", () => {
    const host = "admin.propertyhub.example";
    expect(adminRewrite("admin.propertyhub.example", "/", host)).toEqual({ to: "/admin" });
    expect(adminRewrite("Admin.PropertyHub.example:443", "/settings/roles", host)).toEqual({
      to: "/admin/settings/roles",
    });
    expect(adminRewrite("admin.propertyhub.example", "/admin/kyc", host)).toBeNull();
    expect(adminRewrite("www.propertyhub.example", "/admin/login", host)).toBe("not-found");
    expect(adminRewrite("www.propertyhub.example", "/search", host)).toBeNull();
    expect(adminRewrite("localhost:3000", "/admin", undefined)).toBeNull();
  });
});

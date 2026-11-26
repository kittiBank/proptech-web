import { describe, expect, it } from "vitest";
import { bangkokDay } from "@/lib/format";
import type { AdminUserDto } from "@/types/api";
import { listAuditLog, resetMockAdmin } from "./admin";
import {
  actOnUser,
  addDays,
  adminRevenue,
  createCms,
  cmsErrors,
  decideRefund,
  getAdminUser,
  getCms,
  listAdminUsers,
  listCms,
  movePin,
  promoSettingsErrors,
  promoWeek,
  publishCms,
  resetMockAdminData,
  revealPhone,
  revenueMonths,
  saveCms,
} from "./admin-data";
import { actOnReport, listReportCases, resetMockAdminQueues } from "./admin-queues";

const NOW = Date.parse("2026-11-26T11:20:00+07:00");
const admin = (role: AdminUserDto["role"] = "super_admin"): AdminUserDto => ({
  id: "a-1",
  name: "นภัส",
  email: "napat@propertyhub.co.th",
  role,
  title: "",
});
const lastAudit = () => listAuditLog(bangkokDay(new Date(NOW)))[0];

function fresh() {
  resetMockAdmin(NOW);
  resetMockAdminQueues(NOW);
  resetMockAdminData(NOW);
}

describe("admin users", () => {
  it("lists queue people, filters and finds shared phones", () => {
    fresh();
    const all = listAdminUsers({}, NOW);
    expect(all.meta.total).toBeGreaterThan(60);
    expect(all.platformTotal).toBe(182_406);
    expect(listAdminUsers({ status: "pending_kyc" }, NOW).data.every((u) => u.status === "pending_kyc")).toBe(true);
    expect(listAdminUsers({ status: "suspended" }, NOW).meta.total).toBe(1);
    expect(listAdminUsers({ q: "88213" }, NOW).data[0]).toMatchObject({ id: "user_88213", sharedPhone: true });
    expect(listAdminUsers({ sharedWith: "user_88213" }, NOW).meta.total).toBe(3);
    expect(
      listAdminUsers({ joined: "7d" }, NOW).data.every((u) => NOW - Date.parse(u.joinedAt) <= 7 * 86_400_000),
    ).toBe(true);
  });

  it("shows a suspension made from a report, and lifts it", () => {
    fresh();
    const scam = listReportCases("open").data.find((c) => c.reported.userId === "user_88213")!;
    actOnReport(scam.id, "suspend", admin(), "", NOW);
    const user = getAdminUser("user_88213", NOW)!;
    expect(user).toMatchObject({ status: "suspended", suspension: { by: "นภัส" } });
    expect(user.sharedPhoneWith).toHaveLength(2);
    expect(user.listingItems.every((l) => l.hidden)).toBe(true);

    expect(actOnUser("user_88213", "suspend", admin(), "x", NOW)).toEqual({ ok: false, reason: "conflict" });
    expect(actOnUser("user_88213", "unsuspend", admin(), "", NOW)).toMatchObject({
      ok: true,
      user: { status: "active" },
    });
    expect(actOnUser("user_88213", "ban", admin(), "ซ้ำ", NOW)).toMatchObject({ ok: true, user: { status: "banned" } });
    expect(lastAudit().action).toBe("แบนถาวร user_88213");
  });

  it("logs revealing the full phone number", () => {
    fresh();
    expect(revealPhone("user_88213", admin(), "ตรวจสอบรายงาน", NOW)).toBe("081-227-4412");
    expect(lastAudit()).toMatchObject({ action: "เปิดดูเบอร์เต็ม user_88213", note: "เหตุผล: ตรวจสอบรายงาน" });
  });
});

describe("admin revenue", () => {
  it("has three months and splits revenue by product", () => {
    fresh();
    const months = revenueMonths(NOW);
    expect(months).toEqual(["2026-11", "2026-10", "2026-09"]);
    const nov = adminRevenue("2026-11", NOW)!;
    expect(nov.through).toBe("2026-11-26");
    expect(nov.byProduct.map((p) => p.product)).toEqual(["agent_plan", "featured", "homepage_pin", "bump"]);
    expect(nov.refundRequests).toHaveLength(2);
    expect(adminRevenue("2026-10", NOW)!.refundRequests).toHaveLength(0);
    expect(adminRevenue("2025-01", NOW)).toBeUndefined();
  });

  it("needs Finance for refunds over ฿1,000 and records the decision", () => {
    fresh();
    expect(decideRefund("PAY-77064", "approve", admin("revenue"), "", NOW)).toEqual({ ok: false, reason: "forbidden" });
    expect(decideRefund("PAY-76990", "approve", admin("revenue"), "", NOW)).toEqual({ ok: true });
    expect(decideRefund("PAY-77064", "approve", admin("finance"), "", NOW)).toEqual({ ok: true });
    const nov = adminRevenue("2026-11", NOW)!;
    expect(nov.refundRequests).toHaveLength(0);
    expect(nov.kpis.refunds).toEqual({ amount: 8_260 + 590 + 1_277, count: 13 });
    expect(lastAudit().action).toBe("อนุมัติคืนเงิน PAY-77064 ฿1,277");
  });
});

describe("homepage pins", () => {
  it("builds the week from pins within capacity", () => {
    fresh();
    const week = promoWeek("2026-11-26");
    expect(week.weekStart).toBe("2026-11-23");
    expect(week.days).toHaveLength(7);
    for (const d of week.days) {
      expect(d.sold).toBeLessThanOrEqual(d.capacity - week.settings.partnerReserved);
      expect(d.partner).toBeLessThanOrEqual(week.settings.partnerReserved);
    }
  });

  it("moves a pin when the days are free and refuses a full day", () => {
    fresh();
    const week = promoWeek("2026-11-26");
    const pin = week.pins.find((p) => p.source === "purchase")!;
    const far = addDays(week.weekStart, 60);
    expect(movePin(pin.id, far, admin(), NOW)).toMatchObject({ ok: true, pin: { start: far, end: addDays(far, 6) } });

    // Fill one day with pins from the same partner source to hit the reserved limit.
    const partner = week.pins.find((p) => p.source === "partner")!;
    const other = week.pins.filter((p) => p.source === "partner" && p.id !== partner.id)[0];
    expect(movePin(other.id, partner.start, admin(), NOW)).toMatchObject({ ok: true });
  });

  it("validates settings", () => {
    expect(promoSettingsErrors({ priceWeek: 1490, slotsPerDay: 24, partnerReserved: 4, districtCap: 6 })).toEqual([]);
    expect(promoSettingsErrors({ priceWeek: 1490, slotsPerDay: 4, partnerReserved: 4, districtCap: 6 })).toHaveLength(
      2,
    );
  });
});

describe("CMS", () => {
  it("lists articles with the in-review one first and saves revisions", () => {
    fresh();
    const [first] = listCms();
    expect(first).toMatchObject({ slug: "resale-condo-checklist", status: "in_review" });
    const article = getCms(first.id)!;
    expect(article.body.some((b) => b.type === "listings")).toBe(true);

    const other = listCms()[1];
    expect(cmsErrors({ ...article, slug: other.slug }, article.id).slugTaken).toBe(true);
    expect(cmsErrors({ ...article, slug: "Bad Slug" }, article.id).errors).toHaveLength(1);

    saveCms(article.id, { ...article, title: "หัวข้อใหม่" }, admin(), NOW);
    expect(getCms(article.id)).toMatchObject({ title: "หัวข้อใหม่", updatedBy: "นภัส" });
    expect(getCms(article.id)!.revisions[0].note).toBe("บันทึกแบบร่าง");
  });

  it("publishes now or on a schedule, and creates drafts", () => {
    fresh();
    const draft = createCms(admin(), NOW);
    expect(draft.status).toBe("draft");
    expect(publishCms(draft.id, admin(), new Date(NOW + 86_400_000).toISOString(), NOW)?.status).toBe("scheduled");
    expect(publishCms(draft.id, admin(), undefined, NOW)?.status).toBe("published");
    expect(lastAudit().action).toBe(`เผยแพร่ ${draft.id}`);
  });
});

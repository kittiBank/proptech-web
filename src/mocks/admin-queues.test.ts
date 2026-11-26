import { describe, expect, it } from "vitest";
import { bangkokDay } from "@/lib/format";
import type { AdminUserDto } from "@/types/api";
import { listAuditLog, resetMockAdmin } from "./admin";
import {
  actOnReport,
  approveListing,
  bulkApprove,
  decideKyc,
  getModerationItem,
  listKycApplications,
  listModeration,
  listReportCases,
  queueCounts,
  queueKpis,
  resetMockAdminQueues,
  returnListing,
  suspendedUsers,
  viewKycDocuments,
} from "./admin-queues";
import { createReport } from "./reports";

const NOW = Date.parse("2026-11-26T11:20:00+07:00");
const napat: AdminUserDto = {
  id: "a-1",
  name: "นภัส",
  email: "napat@propertyhub.co.th",
  role: "super_admin",
  title: "",
};
const lastAudit = () => listAuditLog(bangkokDay(new Date(NOW)))[0];

function fresh() {
  resetMockAdmin(NOW);
  resetMockAdminQueues(NOW);
}

describe("moderation queue", () => {
  it("starts with 38 pending, paid first, and counts the SLA breaches", () => {
    fresh();
    const res = listModeration({});
    expect(res.counts.pending).toBe(38);
    expect(res.meta.totalPages).toBe(2);
    expect(res.data[0].promotion).toBeDefined();
    expect(queueKpis(NOW).pendingListings.overSla).toBeGreaterThan(0);
    expect(listModeration({ flags: "flagged" }).data.every((i) => i.flags.length > 0)).toBe(true);
    expect(listModeration({ paid: true }).meta.total).toBe(3);
  });

  it("approves and returns with an audit entry, moving on to the next item", () => {
    fresh();
    const [first, second] = listModeration({}).data;
    const approved = approveListing(first.id, napat, NOW);
    expect(approved).toMatchObject({ ok: true, item: { status: "done" }, nextId: second.id });
    expect(lastAudit().action).toBe(`อนุมัติ ${first.id}`);
    expect(approveListing(first.id, napat, NOW)).toEqual({ ok: false, reason: "decided" });

    const returned = returnListing(second.id, napat, ["contact_in_photo"], "ลบรูปที่ 7", NOW);
    expect(returned).toMatchObject({ ok: true, item: { status: "returned", decision: { message: "ลบรูปที่ 7" } } });
    expect(queueCounts().moderation).toBe(36);
  });

  it("sends suspected scams to the report queue", () => {
    fresh();
    const id = listModeration({}).data[3].id;
    const before = listReportCases("open").counts.open;
    returnListing(id, napat, ["scam"], "สงสัยหลอกลวง", NOW);
    expect(listReportCases("open").counts.open).toBe(before + 1);
  });

  it("gives the review position and bulk approves", () => {
    fresh();
    const order = listModeration({}).data;
    expect(getModerationItem(order[1].id)?.queue).toMatchObject({
      position: 2,
      total: 38,
      prevId: order[0].id,
      nextId: order[2].id,
    });
    expect(bulkApprove([order[0].id, order[1].id, order[0].id], napat, NOW)).toBe(2);
  });
});

describe("report queue", () => {
  it("orders by severity and folds site reports into one case per listing", () => {
    fresh();
    const open = listReportCases("open");
    expect(open.data[0].severity).toBe("high");
    expect(open.counts).toMatchObject({ open: 7, awaiting_reporter: 3, closed: 2 });

    for (let i = 0; i < 3; i++) createReport("listing-2012", { reason: "inaccurate", details: `ไม่ตรง ${i}` });
    const site = listReportCases("open").data.find((c) => c.listing.slug === "listing-2012");
    expect(site).toMatchObject({ reportCount: 3, severity: "medium", listing: { hidden: true } });
    expect(site?.quotes).toHaveLength(3);
  });

  it("suspends the account and every case about it, and logs it", () => {
    fresh();
    const scam = listReportCases("open").data[0];
    const res = actOnReport(scam.id, "suspend", napat, "ยืนยันจากแชต", NOW);
    expect(res).toMatchObject({ ok: true, case: { status: "resolved", listing: { hidden: true } } });
    expect(suspendedUsers()).toContain(scam.reported.userId);
    expect(
      listReportCases("open")
        .data.filter((c) => c.reported.userId === scam.reported.userId)
        .every((c) => c.reported.suspended),
    ).toBe(true);
    expect(lastAudit()).toMatchObject({ action: `ระงับบัญชี ${scam.reported.name}` });
    expect(actOnReport(scam.id, "warn", napat)).toEqual({ ok: false, reason: "closed" });
  });

  it("moves a case to awaiting the reporter", () => {
    fresh();
    const c = listReportCases("open").data[3];
    actOnReport(c.id, "request_info", napat, "", NOW);
    expect(listReportCases("awaiting_reporter").data.some((x) => x.id === c.id)).toBe(true);
  });
});

describe("KYC queue", () => {
  it("lists the oldest first, logs document views and decisions", () => {
    fresh();
    const pending = listKycApplications("pending");
    expect(pending.counts.pending).toBe(12);
    expect(pending.data[0].name).toBe("วรวุฒิ ทองดี");

    viewKycDocuments(pending.data[0].id, napat, "ตรวจตามคิว", NOW);
    expect(lastAudit()).toMatchObject({ action: `เปิดดูเอกสาร ${pending.data[0].id}`, note: "เหตุผล: ตรวจตามคิว" });

    expect(decideKyc(pending.data[0].id, "approve", napat, "", NOW)).toMatchObject({
      ok: true,
      application: { status: "approved" },
    });
    expect(decideKyc(pending.data[0].id, "reject", napat, "x", NOW)).toEqual({ ok: false, reason: "decided" });
    expect(queueCounts().kyc).toBe(11);
  });
});

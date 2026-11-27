import { describe, expect, it } from "vitest";
import { createDraft } from "./drafts";
import { listAppointments } from "./inbox";
import {
  boostOptions,
  bulkUpdateListings,
  getAvailability,
  getListingForEdit,
  listLeads,
  listSellerListings,
  promoteListings,
  saveListingEdit,
  sellerAccount,
  sellerOverview,
  setAvailability,
} from "./seller";

const U = "u-1";

describe("mock seller workspace", () => {
  it("seeds an Agent Pro workspace with listings in every status", () => {
    const { counts, meta, data } = listSellerListings(U, {});
    expect(counts).toEqual({
      all: 61,
      published: 41,
      pending_review: 2,
      rejected: 1,
      draft: 0,
      expired: 5,
      closed: 12,
    });
    expect(meta).toMatchObject({ page: 1, limit: 10, total: 61, totalPages: 7 });
    // Most viewed first.
    expect(data[0].views7d).toBeGreaterThanOrEqual(data[1].views7d);

    const account = sellerAccount(U);
    expect(account).toMatchObject({ planName: "นายหน้า Pro", credit: 1250, pendingViewings: 3 });
    expect(account.usage.listings).toEqual({ used: 41, limit: 60 });
    expect(account.usage.featured).toEqual({ used: 3, limit: 5 });
  });

  it("filters by status, deal, text and ids, and lists wizard drafts", () => {
    const draft = createDraft(U);
    expect(listSellerListings(U, { status: "draft" }).data.map((l) => l.id)).toEqual([draft.id]);
    expect(listSellerListings(U, { status: "draft" }).data[0]).toMatchObject({ draftStep: "type", draftProgress: 0 });

    const rent = listSellerListings(U, { mode: "rent", limit: 50 });
    expect(rent.data.every((l) => l.mode === "rent")).toBe(true);

    const [first] = listSellerListings(U, { status: "published" }).data;
    expect(listSellerListings(U, { q: first.code!.toLowerCase() }).data.map((l) => l.id)).toContain(first.id);
    expect(listSellerListings(U, { ids: first.id }).data).toHaveLength(1);
  });

  it("renews and closes, skipping listings that do not allow it", () => {
    const [expired] = listSellerListings(U, { status: "expired" }).data;
    const [closed] = listSellerListings(U, { status: "closed" }).data;
    expect(bulkUpdateListings(U, { ids: [expired.id, closed.id], action: "renew" })).toEqual({
      updated: [expired.id],
      skipped: [closed.id],
    });
    expect(listSellerListings(U, {}).counts).toMatchObject({ published: 42, expired: 4 });

    bulkUpdateListings(U, { ids: [expired.id], action: "close" });
    expect(listSellerListings(U, {}).counts).toMatchObject({ published: 41, closed: 13 });
  });

  it("promotes with package slots first, then credit", () => {
    const live = listSellerListings(U, { status: "published", sort: "-leads", limit: 50 }).data.filter(
      (l) => !l.promotion,
    );
    const featured = boostOptions(U).find((o) => o.kind === "featured")!;
    expect(featured.packageLeft).toBe(2);

    const two = promoteListings(U, { ids: [live[0].id, live[1].id], kind: "featured" });
    expect(two).toEqual({
      ok: true,
      data: { promoted: [live[0].id, live[1].id], coveredByPackage: 2, charged: 0, creditLeft: 1250 },
    });
    // Slots used up: the next one is paid from credit.
    expect(promoteListings(U, { ids: [live[2].id], kind: "featured" })).toMatchObject({
      ok: true,
      data: { charged: 590, creditLeft: 660 },
    });
    expect(promoteListings(U, { ids: [live[3].id], kind: "homepage_pin" })).toMatchObject({
      ok: false,
      status: 402,
    });
    const [pending] = listSellerListings(U, { status: "pending_review" }).data;
    expect(promoteListings(U, { ids: [pending.id], kind: "bump" })).toMatchObject({ ok: false, status: 409 });

    const bumped = promoteListings(U, { ids: [live[4].id], kind: "bump" });
    expect(bumped).toMatchObject({ ok: true, data: { coveredByPackage: 1, charged: 0 } });
    expect(sellerAccount(U).usage.bumps.used).toBe(83);
  });

  it("sums the overview from the same listings and viewings", () => {
    const overview = sellerOverview(U, 14);
    const { totals } = listSellerListings(U, {});
    expect(overview.views7d).toBe(totals.views7d);
    expect(overview.dailyViews).toHaveLength(14);
    expect(overview.dailyViews.slice(-7).reduce((s, d) => s + d.views, 0)).toBe(totals.views7d);
    expect(overview.newLeads).toBe(23);
    expect(overview.leadsByChannel).toEqual({ call: 9, chat: 11, line: 3 });
    expect(overview.todo).toMatchObject({ pendingViewings: 3, rejected: 1, expiringSoon: 5, drafts: 0 });
    expect(sellerOverview(U, 90).dailyViews).toHaveLength(90);

    const lister = listAppointments(U).filter((a) => a.role === "lister");
    expect(overview.viewingsThisWeek).toBeLessThanOrEqual(lister.length);
    expect(listLeads(U).filter((l) => l.threadId)).toHaveLength(8);
  });

  it("validates viewing hours", () => {
    expect(getAvailability(U)).toEqual({
      weekdays: { start: "17:00", end: "20:00" },
      weekend: { start: "09:00", end: "19:00" },
      gapMinutes: 60,
    });
    expect(setAvailability(U, { weekdays: { start: "20:00", end: "17:00" } })).toBeUndefined();
    expect(setAvailability(U, { weekdays: null, gapMinutes: 30 })).toMatchObject({ weekdays: null, gapMinutes: 30 });
    expect(getAvailability(U).gapMinutes).toBe(30);
  });
});

describe("mock edit mode (FE-24)", () => {
  const first = (status: "published" | "rejected" | "expired" | "pending_review" | "closed") =>
    listSellerListings(U, { status }).data[0];

  it("opens a seeded listing with prefilled wizard values", () => {
    const listing = first("published");
    const found = getListingForEdit(U, listing.id)!;
    expect(found.listing.id).toBe(listing.id);
    expect(found.values.title).toBe(listing.title);
    expect(found.values.confirmed).toBe(true);
    expect(getListingForEdit(U, "sl-nope")).toBeUndefined();
  });

  it("saves a published listing and keeps it live, with the new title and price in the table", () => {
    const listing = first("published");
    const { values } = getListingForEdit(U, listing.id)!;
    const deal = values.deal === "rent" ? { rentPrice: 25_000 } : { price: 4_250_000 };
    const result = saveListingEdit(U, listing.id, { ...values, ...deal, title: "ห้องมุมวิวเมือง ใกล้รถไฟฟ้า" });
    expect(result.ok).toBe(true);
    const row = listSellerListings(U, { ids: listing.id }).data[0];
    expect(row).toMatchObject({ status: "published", title: "ห้องมุมวิวเมือง ใกล้รถไฟฟ้า" });
    expect(row.price).toBe(values.deal === "rent" ? 25_000 : 4_250_000);
    expect(getListingForEdit(U, listing.id)!.values.title).toBe("ห้องมุมวิวเมือง ใกล้รถไฟฟ้า");
  });

  it("sends a rejected listing back to review only through resubmit", () => {
    const listing = first("rejected");
    const { values } = getListingForEdit(U, listing.id)!;
    expect(saveListingEdit(U, listing.id, values, { resubmit: true }).ok).toBe(true);
    const row = listSellerListings(U, { ids: listing.id }).data[0];
    expect(row).toMatchObject({ status: "pending_review", rejectReason: undefined });
    expect(row.submittedAt).toBeTruthy();
  });

  it("keeps an expired listing expired after a save", () => {
    const listing = first("expired");
    const { values } = getListingForEdit(U, listing.id)!;
    expect(saveListingEdit(U, listing.id, values).ok).toBe(true);
    expect(listSellerListings(U, { ids: listing.id }).data[0].status).toBe("expired");
  });

  it("refuses locked listings, resubmitting a live one and incomplete values", () => {
    const pending = first("pending_review");
    const closed = first("closed");
    const live = first("published");
    const values = getListingForEdit(U, live.id)!.values;
    expect(saveListingEdit(U, pending.id, values)).toMatchObject({ ok: false, status: 409 });
    expect(saveListingEdit(U, closed.id, values)).toMatchObject({ ok: false, status: 409 });
    expect(saveListingEdit(U, live.id, values, { resubmit: true })).toMatchObject({ ok: false, status: 409 });
    expect(saveListingEdit(U, live.id, { ...values, title: "สั้น", photos: [] })).toEqual({
      ok: false,
      status: 422,
      message: ["step details is incomplete", "step photos is incomplete"],
    });
    expect(saveListingEdit(U, "sl-nope", values)).toMatchObject({ ok: false, status: 404 });
  });

  it("points the overview's rejected to-do at the rejected listing", () => {
    const fresh = "u-edit-overview";
    const rejected = listSellerListings(fresh, { status: "rejected" }).data[0];
    expect(sellerOverview(fresh).todo.rejectedListingId).toBe(rejected.id);
  });
});

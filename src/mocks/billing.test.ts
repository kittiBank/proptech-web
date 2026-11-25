import { describe, expect, it } from "vitest";
import type { OrderDto } from "@/types/api";
import {
  PROMPTPAY_CONFIRM_MS,
  addCard,
  applyOrderCoupon,
  createOrder,
  createWizardOrder,
  getBilling,
  getOrder,
  listOrders,
  payOrder,
  removeCard,
  requestRefund,
  setPrimaryCard,
  updateBilling,
} from "./billing";
import { listSellerListings, sellerAccount } from "./seller";

const user = { id: "u-1", email: "somying@example.com" };
const order = (o: OrderDto | string) => {
  if (typeof o === "string") throw new Error(`expected an order, got ${o}`);
  return o;
};

describe("mock billing", () => {
  it("seeds a history in every payment state, newest first", () => {
    const orders = listOrders(user);
    expect(orders.map((o) => o.status).sort()).toEqual(["failed", "paid", "paid", "paid", "paid", "paid", "refunded"]);
    expect(orders[0].createdAt > orders[1].createdAt).toBe(true);
    expect(orders.find((o) => o.status === "paid")!.invoiceNo).toMatch(/^INV-\d{4}-\d{6}$/);
    expect(getBilling(user)).toMatchObject({ credit: 1250, plan: "agent_pro", planPrice: 1290, autoRenew: true });
  });

  it("switches plan after a card payment", () => {
    const o = order(createOrder(user, { kind: "plan", plan: "agent_pro", cycle: "yearly" }));
    expect(o).toMatchObject({ amount: 12_900, status: "pending", backHref: "/pricing" });
    const paid = order(payOrder(user, o.id, { method: "card" }));
    expect(paid).toMatchObject({ status: "paid", method: "card", cardLast4: "4242" });
    expect(getBilling(user)).toMatchObject({ cycle: "yearly", planPrice: 12_900 });
    // Paid orders cannot be paid again.
    expect(payOrder(user, o.id, { method: "card" })).toBe("conflict");
  });

  it("confirms PromptPay a few seconds after the QR is shown and adds the credit", () => {
    const now = Date.now();
    const o = order(createOrder(user, { kind: "credit", amount: 2000 }, now));
    const qr = order(payOrder(user, o.id, { method: "promptpay" }, now));
    expect(qr).toMatchObject({ status: "pending", method: "promptpay" });
    expect(qr.qrPayload).toBeTruthy();
    expect(getOrder(user, o.id, now + 1000)!.status).toBe("pending");
    expect(getOrder(user, o.id, now + PROMPTPAY_CONFIRM_MS + 1)!.status).toBe("paid");
    expect(getBilling(user).credit).toBe(3250);
    // Credit cannot buy credit.
    const again = order(createOrder(user, { kind: "credit", amount: 500 }));
    expect(payOrder(user, again.id, { method: "credit" })).toBe("invalid");
    expect(createOrder(user, { kind: "credit", amount: 123 })).toBe("invalid");
  });

  it("fails a declined card, then succeeds by credit when there is enough", () => {
    const declined = addCard(user, { number: "4000 0000 0000 0002", expiry: "12/30", name: "TEST" });
    if (typeof declined === "string") throw new Error(declined);
    const [listing] = listSellerListings(user.id, { status: "published", sort: "-leads" }).data.filter(
      (l) => !l.promotion,
    );
    const o = order(createOrder(user, { kind: "promotion", promotion: "homepage_pin", listingIds: [listing.id] }));
    expect(o.amount).toBe(1490);
    expect(order(payOrder(user, o.id, { method: "card", cardId: declined.id }))).toMatchObject({
      status: "failed",
      cardLast4: "0002",
    });
    expect(payOrder(user, o.id, { method: "credit" })).toBe("insufficient_credit");

    const coupon = order(applyOrderCoupon(user, o.id, "welcome10"));
    expect(coupon).toMatchObject({ coupon: "WELCOME10", discount: 149, amount: 1341 });
    expect(applyOrderCoupon(user, o.id, "NOPE")).toBe("invalid");

    expect(order(payOrder(user, o.id, { method: "card" }))).toMatchObject({ status: "paid" });
    expect(listSellerListings(user.id, { ids: listing.id }).data[0].promotion?.kind).toBe("homepage_pin");
    expect(order(requestRefund(user, o.id)).status).toBe("refund_requested");
  });

  it("charges only what the package does not cover, and refuses unpublished listings", () => {
    const live = listSellerListings(user.id, { status: "published", limit: 50 }).data.filter((l) => !l.promotion);
    const ids = live.slice(0, 3).map((l) => l.id);
    // 2 featured slots left: one listing is paid.
    expect(order(createOrder(user, { kind: "promotion", promotion: "featured", listingIds: ids })).amount).toBe(590);
    expect(createOrder(user, { kind: "promotion", promotion: "featured", listingIds: ids.slice(0, 2) })).toBe(
      "invalid",
    );
    const [pending] = listSellerListings(user.id, { status: "pending_review" }).data;
    expect(createOrder(user, { kind: "promotion", promotion: "bump", listingIds: [pending.id] })).toBe("not_published");
  });

  it("registers the post wizard's order to pay after review", () => {
    const o = createWizardOrder(user, {
      id: "o-2291",
      promotion: "featured",
      listingTitle: "บ้านใหม่",
      draftId: "d-1",
    });
    expect(o).toMatchObject({ id: "o-2291", amount: 590, doneHref: "/post/d-1/done" });
    expect(o.note).toContain("เมื่อประกาศผ่านการตรวจ");
    // Paying it does not touch the dashboard's listings.
    const before = sellerAccount(user.id).usage.featured.used;
    payOrder(user, "o-2291", { method: "card" });
    expect(sellerAccount(user.id).usage.featured.used).toBe(before);
  });

  it("updates renewal, invoice details and cards", () => {
    expect(updateBilling(user, { autoRenew: false })).toMatchObject({ autoRenew: false });
    expect(updateBilling(user, { taxProfile: { type: "company", name: "บริษัท", taxId: "1", email: "a@b.co" } })).toBe(
      "invalid",
    );
    expect(
      updateBilling(user, { taxProfile: { type: "personal", name: "สมหญิง ใจดี", email: "a@b.co" } }),
    ).toMatchObject({ taxProfile: { type: "personal" } });

    expect(addCard(user, { number: "4242 4242 4242 4241", expiry: "12/30", name: "X" })).toBe("invalid");
    const mc = addCard(user, { number: "5555 5555 5555 4444", expiry: "12/30", name: "X" });
    if (typeof mc === "string") throw new Error(mc);
    expect(mc).toMatchObject({ brand: "mastercard", last4: "4444", primary: false });
    expect(setPrimaryCard(user, mc.id)).toBe(true);
    expect(getBilling(user).cards.find((c) => c.primary)!.id).toBe(mc.id);
    expect(removeCard(user, mc.id)).toBe(true);
    expect(getBilling(user).cards.filter((c) => c.primary)).toHaveLength(1);
  });
});

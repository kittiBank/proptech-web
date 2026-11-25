import {
  COUPONS,
  applyCoupon,
  cardBrand,
  cardDigits,
  cycleLabel,
  isValidCardNumber,
  isValidExpiry,
  isValidTaxId,
  planPrice,
  splitVat,
} from "@/lib/billing";
import { promotionCatalog } from "@/lib/post-wizard";
import { BOOST_CATALOG, PLANS, coverage } from "@/lib/seller";
import {
  CREDIT_TOP_UPS,
  type AddCardRequest,
  type BillingCycle,
  type BillingDto,
  type BoostKind,
  type CreateOrderRequest,
  type OrderDto,
  type PayOrderRequest,
  type PromotionId,
  type SavedCardDto,
  type TaxProfileDto,
  type UpdateBillingRequest,
} from "@/types/api";
import {
  applyPaidPromotion,
  boostOptions,
  changeCredit,
  listSellerListings,
  listingTitles,
  planState,
  setAutoRenew,
  startPlan,
} from "./seller";

/**
 * Orders, saved cards and invoice details behind `/me/orders`, `/me/billing`
 * and `/me/cards` (C12, C13, C15). PromptPay confirms by itself a few seconds
 * after the QR is shown (checked on read, so tests need no timers); the card
 * 4000 0000 0000 0002 is always declined.
 */

type OrderPayload =
  | { kind: "plan"; plan: "agent_pro" | "agency"; cycle: BillingCycle }
  | { kind: "credit" }
  | { kind: "promotion"; promotion: BoostKind | PromotionId; listingIds: string[]; afterReview: boolean };

interface StoredOrder extends OrderDto {
  payload: OrderPayload;
  /** PromptPay: when the mock bank confirms. */
  confirmAt?: string;
}

interface StoredCard extends SavedCardDto {
  declined?: boolean;
}

interface Account {
  orders: StoredOrder[];
  cards: StoredCard[];
  taxProfile: TaxProfileDto;
  autoTopUp: boolean;
  invoiceSeq: number;
}

/** Seconds a mock PromptPay payment takes to "arrive". */
export const PROMPTPAY_CONFIRM_MS = 6_000;
const QR_LIFETIME_MS = 15 * 60_000;
const DECLINED_CARD = "4000000000000002";
const DAY = 86_400_000;

const KEY = "propertyhub:mock:billing";
let store: Record<string, Account> | undefined;

const storage = () => {
  try {
    return typeof window !== "undefined" && process.env.NODE_ENV !== "test" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
};

function load() {
  if (store) return store;
  try {
    store = JSON.parse(storage()?.getItem(KEY) ?? "{}") as Record<string, Account>;
  } catch {
    store = {};
  }
  return store;
}

function persist() {
  try {
    storage()?.setItem(KEY, JSON.stringify(store));
  } catch {
    // Memory only.
  }
}

const beYear = (iso: string) =>
  Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric" }).format(new Date(iso))) + 543;

function nextInvoiceNo(acc: Account, paidAt: string) {
  acc.invoiceSeq += 1;
  return `INV-${beYear(paidAt)}-${String(acc.invoiceSeq).padStart(6, "0")}`;
}

function priced(listPrice: number, discount = 0) {
  const amount = Math.round((listPrice - discount) * 100) / 100;
  return { listPrice, discount, amount, ...splitVat(amount) };
}

function newOrder(
  base: Pick<StoredOrder, "title" | "detail" | "note" | "backHref" | "doneHref" | "payload" | "kind"> & {
    id?: string;
    price: number;
  },
  now: number,
): StoredOrder {
  const { price, id, ...rest } = base;
  return {
    ...rest,
    id: id ?? `o-${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    ...priced(price),
    status: "pending",
    createdAt: new Date(now).toISOString(),
  };
}

function seed(email: string, now: number): Account {
  const acc: Account = {
    orders: [],
    cards: [{ id: "card-1", brand: "visa", last4: "4242", expiry: "08/29", primary: true }],
    taxProfile: {
      type: "company",
      name: "บริษัท สุขุมวิท เรียลตี้ จำกัด",
      taxId: "0105566012344",
      branch: "สำนักงานใหญ่",
      address: "88 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110",
      email,
    },
    autoTopUp: false,
    invoiceSeq: 120,
  };
  const past = (
    daysAgo: number,
    o: Omit<Parameters<typeof newOrder>[0], "backHref" | "doneHref">,
    paid: Partial<StoredOrder>,
  ) => {
    const at = now - daysAgo * DAY;
    const order = newOrder({ ...o, backHref: "/dashboard/billing", doneHref: "/dashboard/billing" }, at);
    Object.assign(order, paid);
    if (order.status === "paid" || order.status === "refunded") {
      order.paidAt = new Date(at).toISOString();
      order.invoiceNo = nextInvoiceNo(acc, order.paidAt);
    }
    acc.orders.push(order);
  };
  const promo = (kind: BoostKind, listing: string) => ({
    kind: "promotion" as const,
    title: BOOST_CATALOG.find((b) => b.kind === kind)!.title,
    detail: listing,
    price: BOOST_CATALOG.find((b) => b.kind === kind)!.price,
    payload: { kind: "promotion" as const, promotion: kind, listingIds: [], afterReview: false },
  });
  past(
    380,
    { kind: "credit", title: "เติมเครดิต", price: 1000, payload: { kind: "credit" } },
    {
      status: "paid",
      method: "promptpay",
    },
  );
  past(53, promo("featured", "คอนโดริมแม่น้ำ 2 ห้องนอน"), { status: "refunded", method: "credit" });
  past(44, promo("homepage_pin", "เพนท์เฮาส์ 3 ห้องนอน"), { status: "paid", method: "credit" });
  past(
    28,
    { kind: "credit", title: "เติมเครดิต", price: 2000, payload: { kind: "credit" } },
    {
      status: "paid",
      method: "promptpay",
    },
  );
  past(
    24,
    {
      kind: "plan",
      title: "แพ็กเกจนายหน้า Pro รายเดือน",
      price: PLANS.agent_pro.price,
      payload: { kind: "plan", plan: "agent_pro", cycle: "monthly" },
    },
    { status: "paid", method: "card", cardLast4: "4242" },
  );
  past(12, promo("auto_bump", "1 ห้องนอน ชั้นสูง วิวเมือง"), {
    status: "failed",
    method: "card",
    cardLast4: "0002",
    failureReason: "ธนาคารปฏิเสธบัตรนี้",
  });
  past(9, promo("featured", "2 ห้องนอน ใกล้ EmQuartier"), { status: "paid", method: "promptpay" });
  return acc;
}

function account(user: { id: string; email: string }, now = Date.now()): Account {
  const all = load();
  all[user.id] ??= seed(user.email, now);
  return all[user.id];
}

/** The declined flag is mock-only. */
function cardDto(card: StoredCard): SavedCardDto {
  const copy: Partial<StoredCard> = { ...card };
  delete copy.declined;
  return copy as SavedCardDto;
}

const strip = (o: StoredOrder): OrderDto => {
  const copy: Partial<StoredOrder> = { ...o };
  delete copy.payload;
  delete copy.confirmAt;
  return copy as OrderDto;
};

function markPaid(userId: string, acc: Account, o: StoredOrder, at: number) {
  o.status = "paid";
  o.paidAt = new Date(at).toISOString();
  o.invoiceNo = nextInvoiceNo(acc, o.paidAt);
  o.failureReason = undefined;
  o.confirmAt = undefined;
  const p = o.payload;
  if (p.kind === "plan") startPlan(userId, p.plan, p.cycle, at);
  if (p.kind === "credit") changeCredit(userId, o.amount);
  if (p.kind === "promotion" && !p.afterReview && p.promotion !== "none") {
    applyPaidPromotion(userId, p.listingIds, p.promotion as BoostKind, at);
  }
}

/** PromptPay payments land once their confirmation time has passed. */
function settle(userId: string, acc: Account, now: number) {
  let changed = false;
  for (const o of acc.orders) {
    if (o.status === "pending" && o.method === "promptpay" && o.confirmAt && Date.parse(o.confirmAt) <= now) {
      if (o.qrExpiresAt && Date.parse(o.qrExpiresAt) < Date.parse(o.confirmAt)) continue;
      markPaid(userId, acc, o, Date.parse(o.confirmAt));
      changed = true;
    }
  }
  if (changed) persist();
}

type User = { id: string; email: string };

export type OrderError = "not_found" | "invalid" | "conflict" | "insufficient_credit" | "not_published";

// --- Orders ----------------------------------------------------------------------

export function createOrder(user: User, body: CreateOrderRequest, now = Date.now()): OrderDto | OrderError {
  const acc = account(user, now);
  let order: StoredOrder;
  if (body?.kind === "plan") {
    if ((body.plan !== "agent_pro" && body.plan !== "agency") || !(body.cycle in cycleLabel)) return "invalid";
    order = newOrder(
      {
        kind: "plan",
        title: `แพ็กเกจ${PLANS[body.plan].name} ${cycleLabel[body.cycle]}`,
        detail: body.cycle === "yearly" ? "12 เดือน ต่ออายุอัตโนมัติ" : "1 เดือน ต่ออายุอัตโนมัติ",
        price: planPrice(body.plan, body.cycle),
        backHref: "/pricing",
        doneHref: "/dashboard/billing",
        payload: { kind: "plan", plan: body.plan, cycle: body.cycle },
      },
      now,
    );
  } else if (body?.kind === "credit") {
    if (!(CREDIT_TOP_UPS as readonly number[]).includes(body.amount)) return "invalid";
    order = newOrder(
      {
        kind: "credit",
        title: "เติมเครดิต",
        detail: "ใช้จ่ายค่าโปรโมตได้ทันที ไม่มีวันหมดอายุ",
        price: body.amount,
        backHref: "/dashboard/billing",
        doneHref: "/dashboard/billing",
        payload: { kind: "credit" },
      },
      now,
    );
  } else if (body?.kind === "promotion") {
    const option = boostOptions(user.id, now).find((o) => o.kind === body.promotion);
    if (!option || !Array.isArray(body.listingIds) || !body.listingIds.length) return "invalid";
    const rows = listSellerListings(user.id, { ids: body.listingIds.join(","), limit: 50 }, now).data;
    if (rows.length !== body.listingIds.length) return "not_found";
    if (rows.some((l) => l.status !== "published")) return "not_published";
    const { charge, covered } = coverage(option, rows.length);
    if (charge <= 0) return "invalid";
    const ids = body.listingIds.join(",");
    order = newOrder(
      {
        kind: "promotion",
        title: `${option.title}${rows.length > 1 ? ` × ${rows.length}` : ""}`,
        detail: listingTitles(user.id, body.listingIds).join(" และ "),
        note: covered ? `ใช้สิทธิ์แพ็กเกจแล้ว ${covered} ประกาศ ยอดนี้คือส่วนที่เหลือ` : "เริ่มทันทีหลังชำระเงิน",
        price: charge,
        backHref: `/dashboard/listings?boost=${ids}`,
        doneHref: "/dashboard/listings",
        payload: { kind: "promotion", promotion: body.promotion, listingIds: body.listingIds, afterReview: false },
      },
      now,
    );
  } else {
    return "invalid";
  }
  acc.orders.push(order);
  persist();
  return strip(order);
}

/** The order the post wizard creates for a paid promotion; it starts once the listing passes review. */
export function createWizardOrder(
  user: User,
  o: { id: string; promotion: PromotionId; listingTitle: string; draftId: string },
  now = Date.now(),
): OrderDto {
  const acc = account(user, now);
  const promo = promotionCatalog.find((p) => p.id === o.promotion)!;
  const order = newOrder(
    {
      id: o.id,
      kind: "promotion",
      title: promo.title,
      detail: o.listingTitle,
      note: `เริ่มนับ ${promo.days ?? 7} วันเมื่อประกาศผ่านการตรวจ ถ้าไม่ผ่าน คืนเงินเต็มจำนวน`,
      price: promo.price,
      backHref: "/dashboard/listings?status=pending_review",
      doneHref: `/post/${encodeURIComponent(o.draftId)}/done`,
      payload: { kind: "promotion", promotion: o.promotion, listingIds: [], afterReview: true },
    },
    now,
  );
  acc.orders = acc.orders.filter((x) => x.id !== o.id);
  acc.orders.push(order);
  persist();
  return strip(order);
}

export function getOrder(user: User, id: string, now = Date.now()): OrderDto | undefined {
  const acc = account(user, now);
  settle(user.id, acc, now);
  const o = acc.orders.find((x) => x.id === id);
  return o && strip(o);
}

export function listOrders(user: User, now = Date.now()): OrderDto[] {
  const acc = account(user, now);
  settle(user.id, acc, now);
  return acc.orders
    .filter((o) => o.status !== "pending" || o.method)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(strip);
}

export function payOrder(user: User, id: string, body: PayOrderRequest, now = Date.now()): OrderDto | OrderError {
  const acc = account(user, now);
  settle(user.id, acc, now);
  const o = acc.orders.find((x) => x.id === id);
  if (!o) return "not_found";
  if (o.status !== "pending" && o.status !== "failed") return "conflict";
  o.failureReason = undefined;
  o.cardLast4 = undefined;

  if (body?.method === "promptpay") {
    Object.assign(o, {
      status: "pending",
      method: "promptpay",
      qrPayload: `00020101021229370016A000000677010111${o.id}5303764540${o.amount.toFixed(2)}`,
      qrExpiresAt: new Date(now + QR_LIFETIME_MS).toISOString(),
      confirmAt: new Date(now + PROMPTPAY_CONFIRM_MS).toISOString(),
    });
  } else if (body?.method === "card") {
    const card = acc.cards.find((c) => c.id === body.cardId) ?? acc.cards.find((c) => c.primary);
    if (!card) return "invalid";
    Object.assign(o, { method: "card", cardLast4: card.last4, qrPayload: undefined, qrExpiresAt: undefined });
    if (card.declined) {
      o.status = "failed";
      o.failureReason = "ธนาคารปฏิเสธบัตรนี้ ลองบัตรอื่นหรือ PromptPay";
    } else {
      markPaid(user.id, acc, o, now);
    }
  } else if (body?.method === "credit") {
    if (o.kind === "credit") return "invalid";
    if (!changeCredit(user.id, -o.amount)) return "insufficient_credit";
    Object.assign(o, { method: "credit", qrPayload: undefined, qrExpiresAt: undefined });
    markPaid(user.id, acc, o, now);
  } else {
    return "invalid";
  }
  persist();
  return strip(o);
}

export function applyOrderCoupon(user: User, id: string, code: string): OrderDto | OrderError {
  const acc = account(user);
  const o = acc.orders.find((x) => x.id === id);
  if (!o) return "not_found";
  if (o.status !== "pending" && o.status !== "failed") return "conflict";
  const key = String(code ?? "")
    .trim()
    .toUpperCase();
  const percent = COUPONS[key];
  if (!percent) return "invalid";
  Object.assign(o, priced(o.listPrice, Math.round((o.listPrice - applyCoupon(o.listPrice, percent)) * 100) / 100), {
    coupon: key,
  });
  persist();
  return strip(o);
}

/** Paid promotions can ask for a refund (e.g. the listing was taken down). */
export function requestRefund(user: User, id: string): OrderDto | OrderError {
  const acc = account(user);
  const o = acc.orders.find((x) => x.id === id);
  if (!o) return "not_found";
  if (o.status !== "paid" || o.kind !== "promotion") return "conflict";
  o.status = "refund_requested";
  persist();
  return strip(o);
}

// --- Billing ---------------------------------------------------------------------

export function getBilling(user: User, now = Date.now()): BillingDto {
  const acc = account(user, now);
  settle(user.id, acc, now);
  const plan = planState(user.id, now);
  return {
    credit: plan.credit,
    autoTopUp: acc.autoTopUp,
    plan: plan.plan,
    planName: PLANS[plan.plan].name,
    cycle: plan.cycle,
    planPrice: planPrice(plan.plan, plan.cycle),
    autoRenew: plan.autoRenew,
    renewsAt: plan.renewsAt,
    cards: acc.cards.map(cardDto),
    taxProfile: acc.taxProfile,
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validTaxProfile(p: Partial<TaxProfileDto> | undefined): p is TaxProfileDto {
  if (!p || (p.type !== "personal" && p.type !== "company")) return false;
  if (!p.name?.trim() || !p.email || !EMAIL.test(p.email)) return false;
  if (p.type === "company" && (!p.taxId || !isValidTaxId(p.taxId) || !p.address?.trim())) return false;
  if (p.taxId && !isValidTaxId(p.taxId)) return false;
  return true;
}

export function updateBilling(user: User, body: UpdateBillingRequest): BillingDto | OrderError {
  const acc = account(user);
  if (body.taxProfile !== undefined) {
    if (!validTaxProfile(body.taxProfile)) return "invalid";
    acc.taxProfile = { ...body.taxProfile, name: body.taxProfile.name.trim() };
  }
  if (typeof body.autoTopUp === "boolean") acc.autoTopUp = body.autoTopUp;
  if (typeof body.autoRenew === "boolean") setAutoRenew(user.id, body.autoRenew);
  persist();
  return getBilling(user);
}

export function addCard(user: User, body: AddCardRequest, now = new Date()): SavedCardDto | OrderError {
  const acc = account(user);
  const brand = cardBrand(body?.number ?? "");
  if (!isValidCardNumber(body?.number ?? "") || !brand || !isValidExpiry(body?.expiry ?? "", now) || !body.name?.trim())
    return "invalid";
  const digits = cardDigits(body.number);
  const card: StoredCard = {
    id: `card-${now.getTime().toString(36)}${acc.cards.length}`,
    brand,
    last4: digits.slice(-4),
    expiry: body.expiry.trim(),
    primary: acc.cards.length === 0,
    declined: digits === DECLINED_CARD,
  };
  acc.cards.push(card);
  persist();
  return cardDto(card);
}

export function removeCard(user: User, id: string): boolean {
  const acc = account(user);
  const card = acc.cards.find((c) => c.id === id);
  if (!card) return false;
  acc.cards = acc.cards.filter((c) => c.id !== id);
  if (card.primary && acc.cards[0]) acc.cards[0].primary = true;
  persist();
  return true;
}

export function setPrimaryCard(user: User, id: string): boolean {
  const acc = account(user);
  if (!acc.cards.some((c) => c.id === id)) return false;
  for (const c of acc.cards) c.primary = c.id === id;
  persist();
  return true;
}

/** Tests and e2e: let a PromptPay payment arrive now. */
export function confirmPromptPay(user: User, id: string) {
  const o = account(user).orders.find((x) => x.id === id);
  if (o?.method === "promptpay" && o.status === "pending") o.confirmAt = new Date().toISOString();
}

export function resetMockBilling() {
  store = {};
}

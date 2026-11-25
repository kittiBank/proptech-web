"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, CircleCheck, LogIn, ReceiptText, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { routes } from "@/data/navigation";
import { ApiError } from "@/lib/api/client";
import { billingQueries, queryKeys } from "@/lib/api/queries";
import { formatBaht } from "@/lib/billing";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session";
import type { OrderDto, PaymentMethod } from "@/types/api";
import { AddCardDialog } from "./card-dialog";
import { PromptPayQr } from "./promptpay-qr";
import { payErrorMessage, useApplyCoupon, usePayOrder } from "./use-billing-actions";

/** Current time, ticking every second while `active` (QR countdown). */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const methodLabel: Record<PaymentMethod, string> = {
  promptpay: "PromptPay",
  card: "บัตร",
  credit: "เครดิต PropertyHub",
};

function Summary({ order }: { order: OrderDto }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const coupon = useApplyCoupon(order.id);
  const editable = order.status === "pending" || order.status === "failed";
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim()) coupon.mutate(code.trim());
  };

  return (
    <aside
      aria-labelledby="order-summary"
      className="rounded-[10px] border border-line bg-white p-5 sm:p-6 lg:sticky lg:top-6"
    >
      <h2 id="order-summary" className="text-[17px] font-semibold text-ink">
        สรุปรายการ
      </h2>
      <div className="mt-3 flex gap-3 border-b border-line pb-3.5">
        <span
          aria-hidden="true"
          className="flex h-[50px] w-16 shrink-0 items-center justify-center rounded bg-violet-100"
        >
          <ReceiptText className="size-5 text-violet-700" />
        </span>
        <p className="min-w-0 text-sm">
          <b className="block font-semibold text-ink">{order.title}</b>
          {order.detail && <span className="line-clamp-2 text-slate">{order.detail}</span>}
        </p>
      </div>
      <dl className="pt-2 text-sm tabular-nums">
        {order.discount > 0 && (
          <>
            <div className="flex justify-between py-1.5">
              <dt className="text-slate">ราคาเต็ม</dt>
              <dd>{formatBaht(order.listPrice, true)}</dd>
            </div>
            <div className="flex justify-between py-1.5">
              <dt className="text-slate">ส่วนลด {order.coupon}</dt>
              <dd className="text-success">-{formatBaht(order.discount, true)}</dd>
            </div>
          </>
        )}
        <div className="flex justify-between py-1.5">
          <dt className="text-slate">ราคาก่อน VAT</dt>
          <dd>{formatBaht(order.subtotal, true)}</dd>
        </div>
        <div className="flex justify-between py-1.5">
          <dt className="text-slate">VAT 7%</dt>
          <dd>{formatBaht(order.vat, true)}</dd>
        </div>
        <div className="mt-1.5 flex justify-between border-t border-line pt-3 text-[17px] font-semibold text-ink">
          <dt>ยอดชำระ</dt>
          <dd>{formatBaht(order.amount, true)}</dd>
        </div>
      </dl>
      {editable && !order.coupon && (
        <div className="mt-3 text-[13px]">
          {open ? (
            <form onSubmit={submit} className="flex gap-2">
              <label htmlFor="coupon" className="sr-only">
                โค้ดส่วนลด
              </label>
              <input
                id="coupon"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="โค้ดส่วนลด"
                autoComplete="off"
                aria-invalid={coupon.isError || undefined}
                aria-describedby={coupon.isError ? "coupon-error" : undefined}
                className={cn(inputClass, "h-10 uppercase")}
              />
              <Button type="submit" variant="outline" size="base" disabled={coupon.isPending}>
                ใช้โค้ด
              </Button>
            </form>
          ) : (
            <p className="flex justify-between text-slate">
              โค้ดส่วนลด
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="font-medium text-brand-strong underline-offset-4 hover:underline"
              >
                ใส่โค้ด
              </button>
            </p>
          )}
          {coupon.isError && (
            <p id="coupon-error" className="mt-1.5 text-danger">
              {coupon.error instanceof ApiError && coupon.error.status === 400
                ? "ไม่พบโค้ดนี้ หรือโค้ดหมดอายุแล้ว"
                : "ใช้โค้ดไม่สำเร็จ ลองอีกครั้ง"}
            </p>
          )}
        </div>
      )}
      {order.note && <p className="mt-4 rounded-md bg-mist p-3 text-[13px] text-slate">{order.note}</p>}
    </aside>
  );
}

function Paid({ order }: { order: OrderDto }) {
  return (
    <section
      aria-labelledby="paid-title"
      className="flex flex-col items-center rounded-[10px] border border-line bg-white px-6 py-10 text-center"
    >
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
        <CircleCheck className="size-8" aria-hidden="true" />
      </span>
      <h2 id="paid-title" className="mt-4 text-xl font-semibold text-ink">
        ชำระเงินสำเร็จ
      </h2>
      <p className="mt-1.5 text-[15px] text-slate">
        {formatBaht(order.amount, true)} ด้วย{order.method ? methodLabel[order.method] : ""}
        {order.cardLast4 ? ` ลงท้าย ${order.cardLast4}` : ""} · ใบกำกับภาษีเลขที่ {order.invoiceNo}
      </p>
      <p className="mt-1 text-sm text-slate">ส่งใบกำกับภาษีไปที่อีเมลของคุณแล้ว</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href={order.doneHref}>ทำต่อ</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={routes.billing}>ดูประวัติการชำระเงิน</Link>
        </Button>
      </div>
    </section>
  );
}

function PayPanel({ order }: { order: OrderDto }) {
  const { data: billing } = useQuery(billingQueries.summary);
  const pay = usePayOrder(order.id);
  const [method, setMethod] = useState<PaymentMethod>(order.method ?? "promptpay");
  const [cardId, setCardId] = useState<string>();
  const [adding, setAdding] = useState(false);
  const qrLive = order.method === "promptpay" && order.status === "pending" && Boolean(order.qrExpiresAt);
  const now = useNow(qrLive);
  const qrLeft = order.qrExpiresAt ? Date.parse(order.qrExpiresAt) - now : 0;
  const qrExpired = qrLive && qrLeft <= 0;

  const cards = billing?.cards ?? [];
  const selectedCard = cardId ?? cards.find((c) => c.primary)?.id;
  const credit = billing?.credit ?? 0;
  const creditShort = credit < order.amount;
  const payable = method === "card" ? Boolean(selectedCard) : method === "credit" ? !creditShort : true;

  const option = (m: PaymentMethod, title: string, description: React.ReactNode, disabled = false) => (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-4 py-3.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
        method === m ? "border-2 border-brand bg-[#FAF8FF] px-[15px] py-[13px]" : "border-line-strong hover:border-ink",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="radio"
        name="method"
        checked={method === m}
        disabled={disabled}
        onChange={() => setMethod(m)}
        className="size-5 shrink-0 accent-brand"
      />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="block text-[13px] text-slate">{description}</span>
      </span>
    </label>
  );

  return (
    <section aria-labelledby="pay-method" className="rounded-[10px] border border-line bg-white p-5 sm:p-6">
      <h2 id="pay-method" className="mb-3.5 text-[17px] font-semibold text-ink">
        วิธีชำระเงิน
      </h2>
      {order.status === "failed" && order.failureReason && (
        <Callout tone="danger" role="alert" title="ชำระไม่สำเร็จ" className="mb-3.5">
          {order.failureReason}
        </Callout>
      )}
      <fieldset className="flex flex-col gap-2.5">
        <legend className="sr-only">เลือกวิธีชำระเงิน</legend>
        {option("promptpay", "PromptPay QR", "สแกนด้วยแอปธนาคารใดก็ได้ ยืนยันทันที")}
        {method === "promptpay" && qrLive && (
          <div className="flex flex-col items-center gap-4 rounded-lg bg-mist p-4 sm:ml-8 sm:flex-row sm:items-center sm:gap-5">
            <PromptPayQr
              payload={order.qrPayload ?? order.id}
              label={`QR PromptPay สำหรับชำระ ${formatBaht(order.amount, true)} (ตัวอย่าง)`}
              className={cn("border-8 border-white", qrExpired && "opacity-30")}
            />
            <div className="text-sm">
              <p className="text-[22px] font-semibold text-ink tabular-nums">{formatBaht(order.amount, true)}</p>
              {qrExpired ? (
                <p className="text-danger">QR หมดอายุแล้ว สร้าง QR ใหม่เพื่อชำระ</p>
              ) : (
                <p className="text-slate tabular-nums">QR หมดอายุใน {mmss(qrLeft)} นาที</p>
              )}
              <p className="mt-2.5 text-slate">หน้านี้จะเปลี่ยนเองเมื่อได้รับเงิน ไม่ต้องส่งสลิป</p>
              {!qrExpired && (
                <p role="status" className="mt-2.5 inline-flex items-center gap-2 font-medium text-brand-strong">
                  <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-brand" />
                  รอการชำระเงิน
                </p>
              )}
            </div>
          </div>
        )}
        {option(
          "card",
          "บัตรเครดิต / เดบิต",
          cards.length
            ? `บัตรลงท้าย ${cards.find((c) => c.id === selectedCard)?.last4 ?? ""} หรือเพิ่มบัตรใหม่`
            : "เพิ่มบัตรใหม่",
        )}
        {method === "card" && (
          <div className="flex flex-col gap-2 sm:ml-8">
            {cards.length > 0 && (
              <div role="radiogroup" aria-label="บัตรที่บันทึกไว้" className="flex flex-wrap gap-2">
                {cards.map((c) => (
                  <label
                    key={c.id}
                    className={cn(
                      "inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                      selectedCard === c.id ? "border-brand bg-brand-soft font-semibold" : "border-line-strong",
                    )}
                  >
                    <input
                      type="radio"
                      name="card"
                      checked={selectedCard === c.id}
                      onChange={() => setCardId(c.id)}
                      className="sr-only"
                    />
                    <span className="uppercase">{c.brand}</span> •••• {c.last4}
                  </label>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="self-start text-sm font-medium text-brand-strong underline-offset-4 hover:underline"
            >
              + เพิ่มบัตรใหม่
            </button>
          </div>
        )}
        {order.kind !== "credit" &&
          option(
            "credit",
            "เครดิต PropertyHub",
            creditShort ? `คงเหลือ ${formatBaht(credit)} ไม่พอสำหรับรายการนี้` : `คงเหลือ ${formatBaht(credit)}`,
            creditShort,
          )}
      </fieldset>

      {pay.isError && (
        <Callout tone="danger" role="alert" className="mt-3.5">
          {payErrorMessage(pay.error)}
        </Callout>
      )}

      {!(method === "promptpay" && qrLive && !qrExpired) && (
        <Button
          size="lg"
          className="mt-5 w-full"
          disabled={!payable || pay.isPending}
          onClick={() => pay.mutate({ method, cardId: method === "card" ? selectedCard : undefined })}
        >
          {pay.isPending ? (
            "กำลังดำเนินการ…"
          ) : method === "promptpay" ? (
            <>
              {qrExpired && <RotateCw aria-hidden="true" />}
              {qrExpired ? "สร้าง QR ใหม่" : `แสดง QR ชำระ ${formatBaht(order.amount, true)}`}
            </>
          ) : (
            `ชำระ ${formatBaht(order.amount, true)}`
          )}
        </Button>
      )}

      <AddCardDialog
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={(card) => {
          setCardId(card.id);
          setMethod("card");
        }}
      />
    </section>
  );
}

function TaxInvoice() {
  const { data } = useQuery(billingQueries.summary);
  if (!data) return <Skeleton className="h-24 w-full rounded-[10px]" />;
  return (
    <section aria-labelledby="tax-invoice" className="rounded-[10px] border border-line bg-white p-5 sm:p-6">
      <h2 id="tax-invoice" className="flex justify-between text-[17px] font-semibold text-ink">
        ใบกำกับภาษี
        <Link
          href={routes.billing}
          className="text-sm font-normal text-brand-strong underline-offset-4 hover:underline"
        >
          เปลี่ยน<span className="sr-only">ข้อมูลใบกำกับภาษี</span>
        </Link>
      </h2>
      <p className="mt-2 text-sm text-slate">
        ออกในนาม <b className="font-medium text-ink">{data.taxProfile.name}</b> ส่งไปที่ {data.taxProfile.email}
      </p>
    </section>
  );
}

/** `/checkout/[orderId]` (C13): pick a method, pay, and land on a receipt. */
export function CheckoutView() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user, isPending: sessionPending } = useSession();
  const {
    data: order,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    ...billingQueries.order(orderId),
    enabled: Boolean(user),
  });

  // A PromptPay payment lands through polling: refresh credit, plan and history once it does.
  const client = useQueryClient();
  const paid = order?.status === "paid";
  useEffect(() => {
    if (!paid) return;
    client.invalidateQueries({ queryKey: queryKeys.billing.summary });
    client.invalidateQueries({ queryKey: queryKeys.billing.orders });
    client.invalidateQueries({ queryKey: queryKeys.seller.all });
  }, [paid, client]);

  if (sessionPending) return <Skeleton className="h-96 w-full rounded-[10px]" />;
  if (!user) {
    return (
      <EmptyState
        icon={LogIn}
        title="เข้าสู่ระบบเพื่อชำระเงิน"
        body="รายการชำระเงินผูกกับบัญชีของคุณ"
        action={
          <Button asChild size="lg">
            <Link href={routes.login({ next: routes.checkout(orderId) })}>เข้าสู่ระบบ</Link>
          </Button>
        }
        className="rounded-lg bg-white"
      />
    );
  }
  if (isPending) {
    return (
      <div role="status" aria-label="กำลังโหลดรายการชำระเงิน" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-96 rounded-[10px]" />
        <Skeleton className="h-72 rounded-[10px]" />
      </div>
    );
  }
  if (isError) {
    return error instanceof ApiError && error.status === 404 ? (
      <EmptyState
        icon={ReceiptText}
        title="ไม่พบรายการชำระเงิน"
        body="ลิงก์อาจไม่ถูกต้อง หรือรายการนี้เป็นของบัญชีอื่น"
        action={
          <Button asChild>
            <Link href={routes.billing}>ไปที่การชำระเงิน</Link>
          </Button>
        }
        className="rounded-lg bg-white"
      />
    ) : (
      <QueryError what="รายการชำระเงิน" onRetry={() => refetch()} retrying={isFetching} />
    );
  }

  const done = order.status === "paid";
  return (
    <div className="flex flex-col gap-4">
      {/* Back link and heading span the page, so the payment card and the summary start on the same line. */}
      {!done && (
        <Link
          href={order.backHref}
          className="inline-flex items-center gap-1 self-start text-sm font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {order.kind === "plan" ? "กลับไปเลือกแพ็กเกจ" : "กลับไปแก้ไข"}
        </Link>
      )}
      <h1 className="text-[26px] font-semibold text-ink sm:text-[28px]">{done ? "ใบเสร็จ" : "ชำระเงิน"}</h1>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          {done ? (
            <Paid order={order} />
          ) : order.status === "refunded" || order.status === "refund_requested" ? (
            <Callout tone="info" title={order.status === "refunded" ? "คืนเงินแล้ว" : "กำลังดำเนินการคืนเงิน"}>
              รายการนี้ไม่ต้องชำระเพิ่ม
            </Callout>
          ) : (
            <>
              <PayPanel order={order} />
              <TaxInvoice />
            </>
          )}
        </div>
        <Summary order={order} />
      </div>
    </div>
  );
}

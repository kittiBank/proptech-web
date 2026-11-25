"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Plus, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { FilterSelect } from "@/components/ui/select";
import { DomainStatus, StatusPill } from "@/components/ui/status-pill";
import { Switch } from "@/components/ui/switch";
import { routes } from "@/data/navigation";
import { billingQueries } from "@/lib/api/queries";
import { cycleLabel, formatBaht, invoiceHtml } from "@/lib/billing";
import { formatDayMonth, formatThaiDate } from "@/lib/seller";
import { paymentStatuses } from "@/lib/status";
import { slotParts } from "@/lib/viewing";
import type { BillingDto, OrderDto, PaymentMethod } from "@/types/api";
import { CancelRenewalDialog, TaxProfileDialog, TopUpDialog } from "./billing-dialogs";
import { AddCardDialog } from "./card-dialog";
import { useRemoveCard, useRequestRefund, useSetPrimaryCard, useUpdateBilling } from "./use-billing-actions";

const methodLabel: Record<PaymentMethod, string> = { promptpay: "PromptPay", card: "บัตร", credit: "เครดิต" };
const card = "flex flex-col rounded-[10px] border border-line bg-white p-5";

/** Buddhist-era year of a Bangkok date. */
const beYear = (iso: string) => Number(slotParts(iso).date.slice(0, 4)) + 543;

function downloadInvoice(order: OrderDto, billing: BillingDto) {
  const url = URL.createObjectURL(new Blob([invoiceHtml(order, billing.taxProfile)], { type: "text/html" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `${order.invoiceNo ?? order.id}.html` });
  a.click();
  URL.revokeObjectURL(url);
}

function Summary({ billing }: { billing: BillingDto }) {
  const [topUp, setTopUp] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [editTax, setEditTax] = useState(false);
  const update = useUpdateBilling();
  const primary = billing.cards.find((c) => c.primary);
  const t = billing.taxProfile;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <section aria-labelledby="credit-title" className={card}>
        <h2 id="credit-title" className="text-[13px] font-normal text-slate">
          เครดิตคงเหลือ
        </h2>
        <p className="mt-1 text-[30px] leading-tight font-semibold text-ink tabular-nums">
          {formatBaht(billing.credit)}
        </p>
        <p className="text-[13px] text-slate">ใช้จ่ายค่าโปรโมตได้ทันที ไม่มีวันหมดอายุ</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 pt-3.5">
          <Button size="base" onClick={() => setTopUp(true)}>
            เติมเครดิต
          </Button>
          <Switch
            label="เติมอัตโนมัติ"
            checked={billing.autoTopUp}
            disabled={update.isPending}
            onCheckedChange={(autoTopUp) => update.mutate({ autoTopUp })}
          />
        </div>
        {billing.autoTopUp && <p className="text-xs text-slate">เติม ฿1,000 เมื่อเหลือต่ำกว่า ฿200</p>}
      </section>

      <section aria-labelledby="plan-title" className={card}>
        <h2 id="plan-title" className="text-[13px] font-normal text-slate">
          แพ็กเกจปัจจุบัน
        </h2>
        <p className="mt-1 text-[22px] font-semibold text-ink">{billing.planName}</p>
        <p className="text-[13px] text-slate">
          {billing.plan === "free"
            ? "ไม่มีค่าใช้จ่าย"
            : billing.autoRenew
              ? `${formatBaht(billing.planPrice)} ${cycleLabel[billing.cycle]}${primary ? ` ตัดบัตร ${primary.last4}` : ""} วันที่ ${formatDayMonth(billing.renewsAt)}`
              : `ไม่ต่ออายุ ใช้ได้ถึง ${formatThaiDate(billing.renewsAt)}`}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-3.5">
          <Button asChild variant="outline" size="base">
            <Link href={routes.pricing}>เปลี่ยนแพ็กเกจ</Link>
          </Button>
          {billing.plan !== "free" &&
            (billing.autoRenew ? (
              <Button variant="ghost" size="base" className="text-slate" onClick={() => setCancel(true)}>
                ยกเลิกต่ออายุ
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="base"
                disabled={update.isPending}
                onClick={() => update.mutate({ autoRenew: true })}
              >
                ต่ออายุอัตโนมัติ
              </Button>
            ))}
        </div>
      </section>

      <section aria-labelledby="tax-title" className={card}>
        <h2 id="tax-title" className="text-[13px] font-normal text-slate">
          ข้อมูลออกใบกำกับภาษี
        </h2>
        <p className="mt-1 font-semibold text-ink">{t.name}</p>
        <p className="text-[13px] text-slate">
          {t.taxId ? `เลขประจำตัวผู้เสียภาษี ${t.taxId}${t.branch ? ` ${t.branch}` : ""}` : "บุคคลธรรมดา"}
        </p>
        <p className="text-[13px] text-slate">ส่งไปที่ {t.email}</p>
        <div className="mt-auto pt-3.5">
          <Button variant="outline" size="base" onClick={() => setEditTax(true)}>
            แก้ไข<span className="sr-only">ข้อมูลออกใบกำกับภาษี</span>
          </Button>
        </div>
      </section>

      <TopUpDialog open={topUp} onClose={() => setTopUp(false)} />
      <CancelRenewalDialog open={cancel} until={formatThaiDate(billing.renewsAt)} onClose={() => setCancel(false)} />
      <TaxProfileDialog open={editTax} value={t} onClose={() => setEditTax(false)} />
    </div>
  );
}

function History({ billing }: { billing: BillingDto }) {
  const { data, isPending, isError, refetch, isFetching } = useQuery(billingQueries.orders);
  const refund = useRequestRefund();
  const years = [...new Set((data ?? []).map((o) => beYear(o.createdAt)))].sort((a, b) => b - a);
  const [picked, setPicked] = useState<number>();
  const year = picked ?? years[0];
  const rows = (data ?? []).filter((o) => beYear(o.createdAt) === year);

  const columns: DataColumn<OrderDto>[] = [
    {
      id: "date",
      header: "วันที่",
      className: "whitespace-nowrap tabular-nums",
      cell: (o) => formatThaiDate(o.paidAt ?? o.createdAt),
    },
    {
      id: "item",
      header: "รายการ",
      cell: (o) => (
        <span className="block min-w-[200px]">
          {o.title}
          {o.detail && <span className="block text-[13px] text-slate">{o.detail}</span>}
        </span>
      ),
    },
    {
      id: "amount",
      header: "ยอด",
      align: "right",
      className: "font-semibold whitespace-nowrap",
      cell: (o) => formatBaht(o.amount),
    },
    {
      id: "method",
      header: "ชำระด้วย",
      className: "whitespace-nowrap",
      cell: (o) => (o.method ? `${methodLabel[o.method]}${o.cardLast4 ? ` ${o.cardLast4}` : ""}` : "–"),
    },
    { id: "status", header: "สถานะ", cell: (o) => <DomainStatus info={paymentStatuses[o.status]} /> },
    {
      id: "doc",
      header: "เอกสาร",
      className: "whitespace-nowrap",
      cell: (o) => (
        <span className="flex flex-wrap items-center gap-x-3">
          {o.invoiceNo && (
            <button
              type="button"
              onClick={() => downloadInvoice(o, billing)}
              className="min-h-9 font-medium text-brand-strong underline-offset-4 hover:underline"
            >
              ใบกำกับภาษี<span className="sr-only"> {o.invoiceNo}</span>
            </button>
          )}
          {(o.status === "pending" || o.status === "failed") && (
            <Link
              href={routes.checkout(o.id)}
              className="inline-flex min-h-9 items-center font-medium text-brand-strong underline-offset-4 hover:underline"
            >
              ชำระต่อ<span className="sr-only"> {o.title}</span>
            </Link>
          )}
          {o.status === "paid" && o.kind === "promotion" && (
            <button
              type="button"
              disabled={refund.isPending}
              onClick={() => refund.mutate(o.id)}
              className="min-h-9 text-slate underline-offset-4 hover:text-ink hover:underline"
            >
              ขอคืนเงิน<span className="sr-only"> {o.title}</span>
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <section aria-labelledby="history-title" className="rounded-[10px] border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h2 id="history-title" className="text-[17px] font-semibold text-ink">
          ประวัติการชำระเงิน
        </h2>
        {years.length > 0 && (
          <FilterSelect
            label="ปี"
            value={String(year)}
            options={years.map((y) => ({ value: String(y), label: `ปี ${y}` }))}
            onChange={(y) => setPicked(Number(y))}
            className="h-9"
          />
        )}
      </div>
      {isPending ? (
        <Skeleton className="mx-5 mb-5 h-56" />
      ) : isError ? (
        <QueryError what="ประวัติการชำระเงิน" onRetry={() => refetch()} retrying={isFetching} className="m-5" />
      ) : rows.length === 0 ? (
        <EmptyState icon={ReceiptText} title="ยังไม่มีการชำระเงิน" body="รายการชำระเงินและใบกำกับภาษีจะแสดงที่นี่" />
      ) : (
        <DataTable
          caption={`ประวัติการชำระเงิน ปี ${year}`}
          columns={columns}
          rows={rows}
          getRowId={(o) => o.id}
          className="rounded-none border-x-0 border-b-0"
        />
      )}
    </section>
  );
}

function Cards({ billing }: { billing: BillingDto }) {
  const [adding, setAdding] = useState(false);
  const remove = useRemoveCard();
  const primary = useSetPrimaryCard();
  return (
    <section aria-labelledby="cards-title" className="rounded-[10px] border border-line bg-white p-5">
      <h2 id="cards-title" className="text-[17px] font-semibold text-ink">
        วิธีชำระเงิน
      </h2>
      <ul className="mt-3.5 grid grid-cols-1 gap-3 md:grid-cols-2">
        {billing.cards.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-3.5">
            <span
              aria-hidden="true"
              className="inline-flex h-[30px] w-11 items-center justify-center rounded bg-ink text-[11px] font-semibold text-white uppercase"
            >
              {c.brand}
            </span>
            <span className="min-w-0 flex-1">
              <b className="block font-semibold text-ink">
                <span className="uppercase">{c.brand}</span> ลงท้าย {c.last4}
              </b>
              <span className="text-[13px] text-slate">
                หมดอายุ {c.expiry}
                {c.primary && " · ใช้ตัดค่าแพ็กเกจ"}
              </span>
            </span>
            {c.primary ? (
              <StatusPill tone="violet">หลัก</StatusPill>
            ) : (
              <span className="flex gap-1">
                <Button variant="ghost" size="sm" disabled={primary.isPending} onClick={() => primary.mutate(c.id)}>
                  ตั้งเป็นหลัก<span className="sr-only"> บัตรลงท้าย {c.last4}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(c.id)}
                >
                  ลบ<span className="sr-only"> บัตรลงท้าย {c.last4}</span>
                </Button>
              </span>
            )}
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-full min-h-[62px] w-full items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-dashed border-line-strong text-sm font-medium text-brand-strong hover:border-brand"
          >
            <Plus className="size-4" aria-hidden="true" />
            เพิ่มบัตร
          </button>
        </li>
      </ul>
      <p className="mt-2.5 text-[13px] text-slate">PromptPay และโอนผ่านแอปธนาคารเลือกได้ตอนชำระ ไม่ต้องบันทึกไว้</p>
      <AddCardDialog open={adding} onClose={() => setAdding(false)} />
    </section>
  );
}

/** `/dashboard/billing` (C15): credit, plan, invoice details, history and saved cards. */
export function BillingView() {
  const { data, isPending, isError, refetch, isFetching } = useQuery(billingQueries.summary);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.015em] text-ink sm:text-[28px]">
          การชำระเงินและใบกำกับภาษี
        </h1>
        <p className="mt-1 text-slate">ทุกยอดรวม VAT 7% ใบกำกับภาษีเต็มรูปออกอัตโนมัติ</p>
      </div>
      {isPending ? (
        <div role="status" aria-label="กำลังโหลดข้อมูลการชำระเงิน" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-44 rounded-[10px]" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-[10px]" />
        </div>
      ) : isError ? (
        <QueryError what="ข้อมูลการชำระเงิน" onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <>
          <Summary billing={data} />
          <History billing={data} />
          <Cards billing={data} />
        </>
      )}
      {data && data.cards.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-slate">
          <CreditCard className="size-4" aria-hidden="true" />
          ยังไม่มีบัตรที่บันทึกไว้ ค่าแพ็กเกจจะต้องชำระเองทุกรอบ
        </p>
      )}
    </div>
  );
}

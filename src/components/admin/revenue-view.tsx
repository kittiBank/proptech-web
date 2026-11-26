"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { FilterSelect } from "@/components/ui/select";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/components/ui/toast";
import { adminRoutes } from "@/lib/admin";
import { formatMonth, paymentMethodLabels, paymentStatusInfo, paymentsCsv, productLabels } from "@/lib/admin-queues";
import { adminApi, adminPaymentsQuery, adminRevenueQuery, adminSessionQuery } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { downloadText } from "@/lib/csv";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  REFUND_FINANCE_THRESHOLD,
  type AdminPaymentDto,
  type AdminRevenueDto,
  type RefundRequestDto,
  type RevenueProduct,
} from "@/types/api";
import { AdminCard } from "./admin-dashboard";
import { AdminPageHeader } from "./admin-shell";
import { useAfterDecision } from "./admin-ui";

/** Darkest to lightest, in the order of the legend (dataviz: one hue, stepped lightness). */
const productColor: Record<RevenueProduct, string> = {
  agent_plan: "bg-violet-700",
  featured: "bg-brand",
  homepage_pin: "bg-violet-400",
  bump: "bg-violet-200",
};

const thbFull = (n: number) => `฿${formatNumber(n)}`;
const dayMonth = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
const stamp = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});

function ByProduct({ data }: { data: AdminRevenueDto }) {
  const total = data.byProduct.reduce((sum, p) => sum + p.amount, 0) || 1;
  const pct = (n: number) => Math.round((n / total) * 100);
  const summary = data.byProduct.map((p) => `${productLabels[p.product]} ${pct(p.amount)}%`).join(" ");
  return (
    <AdminCard
      title="รายได้ตามประเภท"
      description={`1 ถึง ${dayMonth.format(new Date(`${data.through}T12:00:00+07:00`))} · รวม VAT`}
    >
      <div role="img" aria-label={summary} className="mt-3.5 mb-2.5 flex h-3.5 gap-0.5 overflow-hidden rounded">
        {data.byProduct.map((p) => (
          <span key={p.product} className={productColor[p.product]} style={{ width: `${(p.amount / total) * 100}%` }} />
        ))}
      </div>
      <ul>
        {data.byProduct.map((p) => (
          <li key={p.product} className="flex items-center gap-2 border-t border-line py-1.5">
            <span aria-hidden="true" className={cn("size-2.5 rounded-[2px]", productColor[p.product])} />
            <span className="flex-1">{productLabels[p.product]}</span>
            <b className="font-semibold tabular-nums">{thbFull(p.amount)}</b>
            <span className="w-11 text-right text-slate tabular-nums">{pct(p.amount)}%</span>
          </li>
        ))}
      </ul>
    </AdminCard>
  );
}

function Refunds({ requests, canFinance }: { requests: RefundRequestDto[]; canFinance: boolean }) {
  const refresh = useAfterDecision(["admin", "revenue"], ["admin", "payments"]);
  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" }) =>
      adminApi.decideRefund(id, { decision }),
    onSuccess: (_res, { id, decision }) => {
      toast(`${decision === "approve" ? "อนุมัติ" : "ปฏิเสธ"}คืนเงิน ${id} แล้ว`);
      refresh();
    },
    onError: (error) =>
      toast(
        error instanceof ApiError && error.status === 403
          ? "ยอดเกิน ฿1,000 ต้องให้ Finance อนุมัติ"
          : "บันทึกไม่สำเร็จ ลองอีกครั้ง",
      ),
  });
  return (
    <AdminCard
      title="รออนุมัติคืนเงิน"
      description={`เกิน ฿${formatNumber(REFUND_FINANCE_THRESHOLD)} ต้องให้ Finance อนุมัติ`}
    >
      {requests.length === 0 ? (
        <p className="mt-3 border-t border-line pt-3 text-slate">-</p>
      ) : (
        <ul className="mt-2">
          {requests.map((r) => {
            const blocked = r.needsFinance && !canFinance;
            return (
              <li key={r.paymentId} className="flex flex-wrap items-center gap-2.5 border-t border-line py-2.5">
                <span className="min-w-0 flex-1">
                  <b className="block font-semibold">
                    {r.paymentId} {r.customer}
                  </b>
                  <span className="text-xs text-slate">{r.reason}</span>
                  {blocked && <span className="block text-xs text-warning">ต้องให้ Finance อนุมัติ</span>}
                </span>
                <b className="font-semibold tabular-nums">{thbFull(r.amount)}</b>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`ปฏิเสธ คืนเงิน ${r.paymentId}`}
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: r.paymentId, decision: "reject" })}
                >
                  ปฏิเสธ
                </Button>
                <Button
                  size="sm"
                  aria-label={`อนุมัติ คืนเงิน ${r.paymentId}`}
                  disabled={decide.isPending || blocked}
                  onClick={() => decide.mutate({ id: r.paymentId, decision: "approve" })}
                >
                  อนุมัติ
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </AdminCard>
  );
}

const paymentColumns: DataColumn<AdminPaymentDto>[] = [
  {
    id: "at",
    header: "เวลา",
    cell: (p) => <span className="whitespace-nowrap tabular-nums">{stamp.format(new Date(p.at))}</span>,
  },
  { id: "id", header: "เลขที่", cell: (p) => <span className="tabular-nums">{p.id}</span> },
  { id: "customer", header: "ลูกค้า", cell: (p) => p.customer },
  { id: "item", header: "รายการ", cell: (p) => p.item },
  { id: "amount", header: "ยอด", align: "right", cell: (p) => <b className="font-semibold">{thbFull(p.amount)}</b> },
  { id: "method", header: "ช่องทาง", cell: (p) => paymentMethodLabels[p.method] },
  {
    id: "status",
    header: "สถานะ",
    cell: (p) => (
      <StatusPill tone={paymentStatusInfo[p.status].tone} className="h-5 px-2 text-[11px]">
        {paymentStatusInfo[p.status].label}
      </StatusPill>
    ),
  },
];

function Payments() {
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const { data, isPending, isError, refetch, isFetching } = useQuery(adminPaymentsQuery(page));
  const exportCsv = async () => {
    setExporting(true);
    try {
      downloadText("payments.csv", paymentsCsv((await adminApi.allPayments()).data));
    } catch {
      toast("ส่งออกไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setExporting(false);
    }
  };
  return (
    <section
      aria-labelledby="payments-title"
      className="flex flex-col gap-0 overflow-hidden rounded-lg border border-line bg-white"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 id="payments-title" className="text-[15px] font-semibold">
          รายการชำระเงินล่าสุด
        </h2>
        <Button variant="outline" size="sm" disabled={exporting} onClick={exportCsv}>
          <Download aria-hidden="true" />
          ส่งออกให้บัญชี
        </Button>
      </div>
      {isPending ? (
        <div role="status" aria-label="กำลังโหลดรายการชำระเงิน" className="flex flex-col gap-2 px-4 pb-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : isError ? (
        <QueryError what="รายการชำระเงิน" onRetry={() => refetch()} retrying={isFetching} className="m-4" />
      ) : (
        <DataTable
          caption="รายการชำระเงินล่าสุด"
          columns={paymentColumns}
          rows={data.data}
          getRowId={(p) => p.id}
          className="rounded-none border-x-0 border-b-0"
          pagination={{ page: data.meta.page, pageCount: data.meta.totalPages, onPageChange: setPage }}
          footer={<span className="tabular-nums">ทั้งหมด {formatNumber(data.meta.total)} รายการ</span>}
        />
      )}
    </section>
  );
}

/** E7: month KPIs, revenue by product, refund approvals and the latest payments. */
export function RevenueView() {
  const router = useRouter();
  const params = useSearchParams();
  const month = params.get("month") ?? undefined;
  const { data, isPending, isError, refetch, isFetching } = useQuery(adminRevenueQuery(month));
  const { data: admin } = useQuery(adminSessionQuery);
  const canFinance = admin?.role === "finance" || admin?.role === "super_admin";

  const r = data?.data;
  return (
    <>
      <AdminPageHeader
        title="รายได้และการชำระเงิน"
        description="ข้อมูลจาก payment gateway ล่าช้าไม่เกิน 5 นาที"
        actions={
          data && (
            <FilterSelect
              label="เดือน"
              value={data.data.month}
              options={data.months.map((m) => ({ value: m, label: formatMonth(m) }))}
              onChange={(m) =>
                router.replace(m === data.months[0] ? adminRoutes.revenue : `${adminRoutes.revenue}?month=${m}`)
              }
            />
          )
        }
      />
      {isPending ? (
        <div role="status" aria-label="กำลังโหลดรายได้" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : isError || !r ? (
        <QueryError what="รายได้" onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <KpiCard
              className="p-4"
              label={`รายได้เดือนนี้ (1 ถึง ${dayMonth.format(new Date(`${r.through}T12:00:00+07:00`))})`}
              value={thbFull(r.kpis.revenue)}
              delta={{
                text: `${r.kpis.changePct > 0 ? "+" : ""}${r.kpis.changePct}% จากช่วงเดียวกันเดือนก่อน`,
                direction: r.kpis.changePct > 0 ? "up" : r.kpis.changePct < 0 ? "down" : "flat",
              }}
            />
            <KpiCard
              className="p-4"
              label="สมาชิกแพ็กเกจที่จ่ายอยู่"
              value={formatNumber(r.kpis.members.total)}
              hint={`Pro ${formatNumber(r.kpis.members.pro)} · เอเจนซี ${formatNumber(r.kpis.members.agency)}`}
            />
            <KpiCard
              className="p-4"
              label="ยกเลิกต่ออายุเดือนนี้"
              value={`${r.kpis.churnPct}%`}
              hint={
                <span className={cn(r.kpis.churnPct > r.kpis.churnTargetPct && "text-danger")}>
                  เป้าไม่เกิน {r.kpis.churnTargetPct}%
                </span>
              }
            />
            <KpiCard
              className="p-4"
              label="คืนเงินเดือนนี้"
              value={thbFull(r.kpis.refunds.amount)}
              hint={`${formatNumber(r.kpis.refunds.count)} รายการ`}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ByProduct data={r} />
            <Refunds requests={r.refundRequests} canFinance={canFinance} />
          </div>
        </>
      )}
      <Payments />
    </>
  );
}

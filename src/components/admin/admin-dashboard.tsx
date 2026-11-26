"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BarChart } from "@/components/ui/bar-chart";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { canOpen, sectionHref } from "@/lib/admin";
import { adminDashboardQuery, adminSessionQuery } from "@/lib/api/admin";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminAlertSeverity, AdminDashboardDto, AdminReviewerStatDto, AdminSection } from "@/types/api";
import { AdminPageHeader } from "./admin-shell";

const severityDot: Record<AdminAlertSeverity, string> = {
  high: "bg-danger",
  medium: "bg-warning-line",
  low: "bg-slate",
};
const severityWord: Record<AdminAlertSeverity, string> = { high: "ด่วน", medium: "ควรดู", low: "แจ้งให้ทราบ" };

const time = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
const hh = (hour: number) => String(hour).padStart(2, "0");

export function AdminCard({
  title,
  description,
  children,
  className,
  flush,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Content runs edge to edge (tables). */
  flush?: boolean;
}) {
  return (
    <section
      className={cn("rounded-lg border border-line bg-white", flush ? "overflow-hidden" : "p-[18px]", className)}
    >
      <div className={cn(flush && "px-4 pt-3.5 pb-3")}>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-slate">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** A KPI card that opens the area it counts, when the role may open it. */
function Stat({ section, canGo, ...props }: { section: AdminSection; canGo: boolean } & Parameters<typeof KpiCard>[0]) {
  const card = <KpiCard {...props} className="h-full p-4 [&>p:nth-child(2)]:text-2xl" />;
  return canGo ? (
    <Link href={sectionHref[section]} className="rounded-lg hover:[&>div]:border-violet-200">
      {card}
    </Link>
  ) : (
    card
  );
}

const teamColumns: DataColumn<AdminReviewerStatDto>[] = [
  { id: "name", header: "ผู้ตรวจ", cell: (r) => r.name },
  { id: "reviewed", header: "ตรวจแล้ว", align: "right", cell: (r) => formatNumber(r.reviewed) },
  { id: "avg", header: "เวลาเฉลี่ย", align: "right", cell: (r) => `${r.avgMinutes} นาที` },
  { id: "disputed", header: "ถูกโต้แย้ง", align: "right", cell: (r) => `${r.disputedPct.toFixed(1)}%` },
];

function Dashboard({ data, can }: { data: AdminDashboardDto; can: (s: AdminSection) => boolean }) {
  const { kpis, hourly, alerts, team, automation } = data;
  const done = hourly.filter((h) => h.count !== null);
  const peak = done.reduce((a, b) => ((b.count ?? 0) > (a.count ?? 0) ? b : a), done[0] ?? hourly[0]);
  const lastHour = done.at(-1)?.hour ?? 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat
          section="moderation"
          canGo={can("moderation")}
          label="รอตรวจประกาศ"
          value={formatNumber(kpis.pendingListings.count)}
          hint={<span className="text-danger">เกิน SLA 2 ชม. อยู่ {kpis.pendingListings.overSla}</span>}
        />
        <Stat
          section="reports"
          canGo={can("reports")}
          label="รายงานเปิดอยู่"
          value={formatNumber(kpis.openReports.count)}
          hint={<span className="text-danger">มิจฉาชีพ {kpis.openReports.scam} เรื่อง</span>}
        />
        <Stat
          section="kyc"
          canGo={can("kyc")}
          label="รอยืนยันนายหน้า"
          value={formatNumber(kpis.pendingKyc.count)}
          hint={<span className="text-warning">เก่าสุด {kpis.pendingKyc.oldestHours} ชม.</span>}
        />
        <Stat
          section="revenue"
          canGo={can("revenue")}
          label="รายได้วันนี้"
          value={`฿${formatNumber(kpis.revenueToday.amount)}`}
          delta={{
            text: `${kpis.revenueToday.changePct >= 0 ? "+" : ""}${kpis.revenueToday.changePct}% จาก${kpis.revenueToday.comparedTo}`,
            direction: kpis.revenueToday.changePct > 0 ? "up" : kpis.revenueToday.changePct < 0 ? "down" : "flat",
          }}
        />
        <Stat
          section="moderation"
          canGo={can("moderation")}
          label="ประกาศใหม่วันนี้"
          value={formatNumber(kpis.newListings.count)}
          hint={`ผ่านอัตโนมัติ ${kpis.newListings.autoApprovedPct}%`}
        />
        <Stat
          section="users"
          canGo={can("users")}
          label="ผู้ใช้ใหม่วันนี้"
          value={formatNumber(kpis.newUsers.count)}
          hint={`นายหน้า ${kpis.newUsers.agents}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
        <AdminCard
          title="ประกาศเข้าคิวตรวจรายชั่วโมง"
          description={`วันนี้ถึง ${hh(lastHour)}:00 · แท่งสีอ่อนคือค่าเฉลี่ยวันเดียวกัน 4 สัปดาห์`}
        >
          <BarChart
            className="mt-3"
            heightClassName="h-36"
            labelCount={8}
            format={(v) => `${v} รายการ`}
            data={hourly.map((h) => ({ label: hh(h.hour), value: h.count ?? h.average, highlight: h.count !== null }))}
            summary={`ประกาศเข้าคิวรายชั่วโมงวันนี้ถึง ${hh(lastHour)}:00 สูงสุด ${peak?.count ?? 0} รายการตอน ${hh(peak?.hour ?? 0)}:00`}
          />
        </AdminCard>

        <AdminCard title="ต้องดูวันนี้">
          <ul className="mt-1.5">
            {alerts.map((a) => {
              const body = (
                <>
                  <span
                    className={cn("mt-1.5 size-2 shrink-0 rounded-full", severityDot[a.severity])}
                    aria-hidden="true"
                  />
                  <span>
                    <span className="sr-only">{severityWord[a.severity]}: </span>
                    <span className="block font-semibold">{a.title}</span>
                    <span className="block text-xs text-slate">{a.detail}</span>
                  </span>
                </>
              );
              return (
                <li key={a.id} className="border-t border-line first:border-t-0">
                  {can(a.section) ? (
                    <Link
                      href={sectionHref[a.section]}
                      className="flex gap-2.5 py-2.5 text-ink hover:text-brand-strong"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex gap-2.5 py-2.5">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AdminCard title="ทีมตรวจวันนี้" flush>
          <DataTable
            caption="ทีมตรวจวันนี้"
            columns={teamColumns}
            rows={team}
            getRowId={(r) => r.adminId}
            className="rounded-none border-x-0 border-b-0"
          />
        </AdminCard>
        <AdminCard title="ระบบตรวจอัตโนมัติ" description="7 วันล่าสุด">
          <dl className="mt-3 grid grid-cols-[140px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
            <dt className="text-slate">ผ่านอัตโนมัติ</dt>
            <dd>
              {automation.autoApprovedPct}% <span className="text-slate">(สุ่มตรวจซ้ำ {automation.spotCheckPct}%)</span>
            </dd>
            <dt className="text-slate">ส่งให้คนตรวจ</dt>
            <dd>{automation.toReviewerPct}%</dd>
            <dt className="text-slate">ปฏิเสธอัตโนมัติ</dt>
            <dd>
              {automation.autoRejectedPct}% <span className="text-slate">{automation.autoRejectReasons.join(" ")}</span>
            </dd>
            <dt className="text-slate">ความแม่นยำ</dt>
            <dd>{automation.accuracyPct}% เทียบกับผลคนตรวจ</dd>
          </dl>
        </AdminCard>
      </div>
    </>
  );
}

/** E1: today's queues, revenue and sign-ups, the hourly intake, alerts and the review team. */
export function AdminDashboard() {
  const { data: admin } = useQuery(adminSessionQuery);
  const { data, isPending, isError, refetch, isFetching } = useQuery(adminDashboardQuery);
  const can = (s: AdminSection) => Boolean(admin && canOpen(admin.role, s));

  return (
    <>
      <AdminPageHeader
        title="แดชบอร์ด"
        description={
          data
            ? `ภาพรวมวันนี้ · อัปเดต ${time.format(new Date(data.data.updatedAt))} ทุก 5 นาที`
            : "ภาพรวมวันนี้ · อัปเดตทุก 5 นาที"
        }
      />
      {isPending ? (
        <div role="status" aria-label="กำลังโหลดแดชบอร์ด" className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[104px] rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-60 rounded-lg" />
        </div>
      ) : isError ? (
        <QueryError what="แดชบอร์ด" onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <Dashboard data={data.data} can={can} />
      )}
    </>
  );
}

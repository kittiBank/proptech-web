"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import { ProgressBar } from "@/components/account/progress-bar";
import { BarChart } from "@/components/ui/bar-chart";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/choice";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { StatusPill } from "@/components/ui/status-pill";
import { routes } from "@/data/navigation";
import { sellerQueries } from "@/lib/api/queries";
import { formatNumber } from "@/lib/format";
import { boostHref, formatCountdown, formatDayMonth, overviewRanges, promotionNote } from "@/lib/seller";
import { slotParts } from "@/lib/viewing";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session";
import type { OverviewRange, SellerListingDto, SellerOverviewDto } from "@/types/api";
import { ListingCell } from "./listing-thumb";

const percent = (n: number) => `${(n * 100).toFixed(1)}%`;

function viewsDelta(o: SellerOverviewDto) {
  if (!o.viewsPrev7d) return undefined;
  const change = (o.views7d - o.viewsPrev7d) / o.viewsPrev7d;
  const text = `${change >= 0 ? "+" : ""}${Math.round(change * 100)}% จาก 7 วันก่อน`;
  return { text, direction: change > 0 ? "up" : change < 0 ? "down" : "flat" } as const;
}

function TodoList({ todo }: { todo: SellerOverviewDto["todo"] }) {
  const items = [
    todo.pendingViewings > 0 && {
      tone: "warning" as const,
      title: `คำขอนัด ${todo.pendingViewings} รายการรอคุณยืนยัน`,
      detail: todo.firstExpiresAt ? `คำขอแรกหมดอายุใน ${formatCountdown(todo.firstExpiresAt)}` : undefined,
      action: "ดูคำขอ",
      href: routes.dashboardLeads,
    },
    todo.rejected > 0 && {
      tone: "danger" as const,
      title: `${todo.rejected} ประกาศไม่ผ่านการตรวจ`,
      detail: todo.rejectReason,
      action: "แก้ไข",
      href: `${routes.dashboardListings}?status=rejected`,
    },
    todo.expiringSoon > 0 && {
      tone: "neutral" as const,
      title: `${todo.expiringSoon} ประกาศหมดอายุใน 3 วัน`,
      detail: "ต่ออายุฟรีตามแพ็กเกจ",
      action: "ต่ออายุ",
      href: `${routes.dashboardListings}?status=published&sort=expiresAt`,
    },
    todo.drafts > 0 && {
      tone: "neutral" as const,
      title: `${todo.drafts} แบบร่างยังไม่เผยแพร่`,
      detail: todo.latestDraftTitle ? `ล่าสุด: ${todo.latestDraftTitle}` : undefined,
      action: "ทำต่อ",
      href: `${routes.dashboardListings}?status=draft`,
    },
  ].filter((x) => !!x);

  if (items.length === 0) {
    return (
      <p className="mt-4 flex items-center gap-2 text-[15px] text-slate">
        <CircleCheck className="size-5 text-success" aria-hidden="true" />
        ไม่มีงานค้าง เยี่ยมมาก
      </p>
    );
  }
  const dot = { warning: "bg-warning-line", danger: "bg-danger", neutral: "bg-slate" };
  return (
    <ul className="mt-3 flex flex-col divide-y divide-line">
      {items.map((item) => (
        <li key={item.title} className="flex items-center gap-3 py-3">
          <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", dot[item.tone])} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">{item.title}</span>
            {item.detail && <span className="block text-[13px] text-slate">{item.detail}</span>}
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href={item.href}>
              {item.action}
              <span className="sr-only">: {item.title}</span>
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}

function TopListings() {
  const { data, isPending, isError, refetch, isFetching } = useQuery(
    sellerQueries.listings({ status: "published", sort: "-views", limit: 4 }),
  );
  const columns: DataColumn<SellerListingDto>[] = [
    { id: "listing", header: "ประกาศ", cell: (l) => <ListingCell listing={l} /> },
    { id: "views", header: "เข้าชม 7 วัน", align: "right", cell: (l) => formatNumber(l.views7d) },
    { id: "rate", header: "อัตราติดต่อ", align: "right", cell: (l) => percent(l.contactRate) },
    { id: "leads", header: "ผู้สนใจ", align: "right", cell: (l) => formatNumber(l.leads) },
    {
      id: "promo",
      header: "โปรโมต",
      cell: (l) => {
        const note = promotionNote(l);
        return note?.tone === "violet" ? (
          <StatusPill tone="violet">{note.text}</StatusPill>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={boostHref([l.id])}>
              โปรโมต<span className="sr-only"> {l.title}</span>
            </Link>
          </Button>
        );
      },
    },
  ];

  return (
    <section aria-labelledby="top-listings" className="min-w-0 rounded-[10px] border border-line bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="top-listings" className="text-[17px] font-semibold text-ink">
          ประกาศที่มีคนดูมากที่สุด
        </h2>
        <Link
          href={routes.dashboardListings}
          className="text-sm font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          ดูทั้งหมด
        </Link>
      </div>
      <div className="mt-3">
        {isPending ? (
          <Skeleton className="h-56 w-full" />
        ) : isError ? (
          <QueryError what="ประกาศ" onRetry={() => refetch()} retrying={isFetching} />
        ) : (
          <DataTable
            caption="ประกาศที่มีคนดูมากที่สุดใน 7 วัน"
            columns={columns}
            rows={data.data}
            getRowId={(l) => l.id}
            empty="ยังไม่มีประกาศที่เผยแพร่"
            className="rounded-md"
          />
        )}
      </div>
    </section>
  );
}

function PackageUsage() {
  const { data } = useQuery(sellerQueries.account);
  if (!data) return <Skeleton className="h-64 w-full rounded-[10px]" />;
  const rows = [
    { label: "ประกาศที่เผยแพร่", unit: "", ...data.usage.listings },
    { label: "ดันประกาศ", unit: " ครั้ง", ...data.usage.bumps },
    { label: "ประกาศแนะนำ", unit: " ช่อง", ...data.usage.featured },
  ];
  return (
    <section aria-labelledby="package-usage" className="rounded-[10px] border border-line bg-white p-5">
      <h2 id="package-usage" className="text-[17px] font-semibold text-ink">
        แพ็กเกจ{data.planName}
      </h2>
      <p className="text-sm text-slate">ต่ออายุ {formatDayMonth(data.renewsAt)}</p>
      <div className="mt-4 flex flex-col gap-3.5">
        {rows.map((r) => (
          <div key={r.label}>
            <p className="mb-1.5 flex justify-between text-sm">
              <span className="text-ink">{r.label}</span>
              <b className="font-semibold tabular-nums">
                {formatNumber(r.used)} / {formatNumber(r.limit)}
                {r.unit}
              </b>
            </p>
            <ProgressBar value={r.limit ? (r.used / r.limit) * 100 : 0} label={`${r.label} ใช้ไป`} />
          </div>
        ))}
      </div>
      <Button asChild variant="outline" size="base" className="mt-5 w-full">
        <Link href={routes.pricing}>เปลี่ยนแพ็กเกจ</Link>
      </Button>
    </section>
  );
}

/** `/dashboard` (C8): this week at a glance, then what needs doing. */
export function OverviewView() {
  const { user } = useSession();
  const [days, setDays] = useState<OverviewRange>(14);
  const { data, isPending, isError, refetch, isFetching } = useQuery(sellerQueries.overview(days));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.015em] text-ink sm:text-[28px]">
          สวัสดี {user?.firstName}
        </h1>
        <p className="mt-1 text-slate">ภาพรวม 7 วันล่าสุด{data && ` อัปเดต ${slotParts(data.updatedAt).time}`}</p>
      </div>

      {isPending ? (
        <div role="status" aria-label="กำลังโหลดภาพรวม" className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[116px] rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-[10px]" />
        </div>
      ) : isError ? (
        <QueryError what="ภาพรวม" onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <KpiCard label="ยอดเข้าชมประกาศ" value={formatNumber(data.views7d)} delta={viewsDelta(data)} />
            <KpiCard
              label="ผู้สนใจใหม่"
              value={formatNumber(data.newLeads)}
              hint={`โทร ${data.leadsByChannel.call} · แชต ${data.leadsByChannel.chat} · LINE ${data.leadsByChannel.line}`}
            />
            <KpiCard
              label="นัดดูทรัพย์สัปดาห์นี้"
              value={formatNumber(data.viewingsThisWeek)}
              hint={
                data.todo.pendingViewings ? (
                  <span className="font-medium text-warning">รอคุณยืนยัน {data.todo.pendingViewings}</span>
                ) : (
                  "ไม่มีคำขอค้าง"
                )
              }
            />
            <KpiCard
              label="ตอบกลับภายใน 1 ชม."
              value={`${Math.round(data.responseRate * 100)}%`}
              hint={`เฉลี่ย ${data.responseMinutes} นาที`}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section aria-labelledby="daily-views" className="min-w-0 rounded-[10px] border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="daily-views" className="text-[17px] font-semibold text-ink">
                    ยอดเข้าชมรายวัน
                  </h2>
                  <p className="text-sm text-slate">ทุกประกาศรวมกัน {days} วันล่าสุด แท่งเข้มคือ 7 วันนี้</p>
                </div>
                <SegmentedControl
                  label="ช่วงเวลา"
                  value={String(days)}
                  options={overviewRanges.map((r) => ({ value: String(r.value), label: r.label }))}
                  onChange={(v) => setDays(Number(v) as OverviewRange)}
                  className="[&_label]:h-8 [&_label]:px-3 [&_label]:text-[13px]"
                />
              </div>
              <BarChart
                className={cn("mt-5 transition-opacity", isFetching && "opacity-60")}
                data={data.dailyViews.map((d, i) => ({
                  label: formatDayMonth(`${d.date}T12:00:00+07:00`),
                  value: d.views,
                  highlight: i >= data.dailyViews.length - 7,
                }))}
                summary={`ยอดเข้าชมรายวัน ${days} วันล่าสุด 7 วันนี้รวม ${formatNumber(data.views7d)} ครั้ง สูงสุดวันละ ${formatNumber(Math.max(...data.dailyViews.map((d) => d.views)))} ครั้ง`}
                format={(v) => `${formatNumber(v)} ครั้ง`}
              />
              {data.chartNote && <p className="mt-3 text-[13px] text-slate">{data.chartNote}</p>}
            </section>

            <section aria-labelledby="todo" className="rounded-[10px] border border-line bg-white p-5">
              <h2 id="todo" className="text-[17px] font-semibold text-ink">
                ต้องจัดการ
              </h2>
              <TodoList todo={data.todo} />
            </section>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <TopListings />
        <PackageUsage />
      </div>
    </div>
  );
}

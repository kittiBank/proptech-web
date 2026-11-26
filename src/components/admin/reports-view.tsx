"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FormAlert, inputClass } from "@/components/ui/field";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/components/ui/toast";
import { routes } from "@/data/navigation";
import { adminRoutes } from "@/lib/admin";
import { formatWait, reportActionLabels, reportOverSla, severityInfo } from "@/lib/admin-queues";
import { adminApi, reportCasesQuery } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import type { ReportAction, ReportCaseDto, ReportCaseTab } from "@/types/api";
import { AdminPageHeader } from "./admin-shell";
import { AdminTabs, useAfterDecision } from "./admin-ui";

const tabs: { value: ReportCaseTab; label: string }[] = [
  { value: "open", label: "เปิดอยู่" },
  { value: "awaiting_reporter", label: "รอข้อมูลจากผู้แจ้ง" },
  { value: "closed", label: "ปิดแล้ว" },
];
const time = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});

const caseHref = (tab: ReportCaseTab, id?: string) => {
  const q = new URLSearchParams();
  if (tab !== "open") q.set("tab", tab);
  if (id) q.set("case", id);
  const qs = q.toString();
  return `${adminRoutes.reports}${qs ? `?${qs}` : ""}`;
};

function Severity({ c }: { c: ReportCaseDto }) {
  const info = severityInfo[c.severity];
  return (
    <StatusPill tone={info.tone} className="h-5 px-2 text-[11px]">
      {info.label}
    </StatusPill>
  );
}

function columns(tab: ReportCaseTab, current: string | undefined, now: number | null): DataColumn<ReportCaseDto>[] {
  return [
    { id: "severity", header: "ระดับ", cell: (c) => <Severity c={c} /> },
    {
      id: "title",
      header: "เรื่อง",
      cell: (c) => (
        <>
          <Link
            href={caseHref(tab, c.id)}
            scroll={false}
            aria-current={c.id === current ? "true" : undefined}
            className="block font-semibold text-ink hover:text-brand-strong aria-[current=true]:text-brand-strong"
          >
            {c.title}
          </Link>
          <span className="text-xs text-slate">
            {c.listing.code} {c.listing.title}
          </span>
        </>
      ),
    },
    {
      id: "count",
      header: "จำนวน",
      cell: (c) => (
        <span className="whitespace-nowrap">
          {c.reportCount === 0 && !c.systemFlag
            ? "-"
            : `${c.reportCount > 0 ? `${c.reportCount} รายงาน` : ""}${c.systemFlag ? `${c.reportCount > 0 ? " + " : ""}ระบบ` : ""}`}
        </span>
      ),
    },
    { id: "reported", header: "ผู้ถูกรายงาน", cell: (c) => c.reported.name },
    {
      id: "age",
      header: tab === "closed" ? "ปิดเมื่อ" : "เปิดมา",
      cell: (c) => {
        if (tab === "closed") return c.resolution ? time.format(new Date(c.resolution.at)) : "-";
        if (now === null) return null;
        const late = reportOverSla(c, now);
        return (
          <span className={cn("whitespace-nowrap tabular-nums", late && "font-semibold text-danger")}>
            {formatWait(now - Date.parse(c.openedAt))}
            {late && <span className="sr-only"> เกิน SLA</span>}
          </span>
        );
      },
    },
  ];
}

function SuspendDialog({
  c,
  open,
  onOpenChange,
  onConfirm,
  pending,
}: {
  c: ReportCaseDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:w-[440px]">
        <div className="flex flex-col gap-3 p-6">
          <DialogTitle className="pr-10 text-lg font-semibold text-ink">ระงับบัญชี {c.reported.name}?</DialogTitle>
          <DialogDescription className="text-sm text-slate">
            ประกาศทั้ง {c.reported.listings} รายการของบัญชีนี้จะถูกซ่อน และระบบจะแจ้งผู้ที่เคยแชตกับบัญชีนี้ใน 30
            วันโดยอัตโนมัติ
          </DialogDescription>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" size="base" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button variant="danger-solid" size="base" disabled={pending} onClick={onConfirm}>
              ระงับบัญชี
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CaseDetail({ c, tab }: { c: ReportCaseDto; tab: ReportCaseTab }) {
  const id = useId();
  const [note, setNote] = useState("");
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const refresh = useAfterDecision(["admin", "reports"]);
  const act = useMutation({
    mutationFn: (action: ReportAction) => adminApi.actOnReport(c.id, { action, note: note.trim() || undefined }),
    onSuccess: (_res, action) => {
      toast(`${reportActionLabels[action]}: ${c.id}`);
      setConfirmSuspend(false);
      setNote("");
      refresh();
    },
  });
  const closed = tab === "closed";

  return (
    <aside
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-3 rounded-lg border border-line bg-white p-[18px]"
    >
      <div className="flex items-center justify-between gap-2">
        <StatusPill tone={severityInfo[c.severity].tone}>ระดับ{severityInfo[c.severity].label}</StatusPill>
        <span className="text-xs text-slate">
          {c.id}
          {c.assignee && ` · มอบให้: ${c.assignee}`}
        </span>
      </div>
      <h2 id={`${id}-title`} className="text-[17px] font-semibold text-ink">
        {c.title}
      </h2>
      <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
        <dt className="text-slate">ประกาศ</dt>
        <dd>
          <a
            href={routes.property(c.listing.slug)}
            target="_blank"
            rel="noreferrer"
            className="text-brand-strong underline underline-offset-2"
          >
            {c.listing.code}
          </a>{" "}
          {c.listing.hidden ? "ซ่อนแล้ว" : "ยังแสดงอยู่"}
          {c.listing.hidden && c.reportCount >= 3 && !c.resolution && " (อัตโนมัติเมื่อครบ 3 รายงาน)"}
        </dd>
        <dt className="text-slate">ผู้ถูกรายงาน</dt>
        <dd>
          <Link
            href={`${adminRoutes.users}?${new URLSearchParams({ q: c.reported.userId })}`}
            className="text-brand-strong underline underline-offset-2"
          >
            {c.reported.name}
          </Link>{" "}
          บัญชีอายุ {c.reported.accountAgeDays} วัน · {c.reported.listings} ประกาศ
          {c.reported.suspended && (
            <StatusPill tone="danger" className="ml-1.5 h-5 px-2 text-[11px]">
              ระงับแล้ว
            </StatusPill>
          )}
        </dd>
        <dt className="text-slate">ผู้แจ้ง</dt>
        <dd>
          {c.reporters.count > 0 ? `${c.reporters.count} คน · ยืนยันเบอร์แล้ว ${c.reporters.verified}` : "ระบบตรวจพบ"}
        </dd>
      </dl>

      {c.quotes.map((q) => (
        <blockquote
          key={`${q.reporter}-${q.at}`}
          className="border-l-3 border-line-strong py-1 pl-3 text-[13px] text-slate"
        >
          “{q.text}”
          <span className="block text-xs">
            {q.reporter} · {time.format(new Date(q.at))}
          </span>
        </blockquote>
      ))}
      {c.evidenceMessages > 0 && (
        <p className="text-[13px]">หลักฐานในแชตในแอป: ข้อความที่ถูกแจ้ง {c.evidenceMessages} ข้อความ</p>
      )}

      {closed ? (
        c.resolution && (
          <p className="rounded-md bg-mist px-3 py-2 text-[13px]">
            {reportActionLabels[c.resolution.action]} โดย {c.resolution.by} · {time.format(new Date(c.resolution.at))}
            {c.resolution.note && <span className="block text-slate">{c.resolution.note}</span>}
          </p>
        )
      ) : (
        <>
          <label htmlFor={`${id}-note`} className="mt-1 text-[13px] font-semibold">
            การดำเนินการ
            <span className="block font-normal text-slate">หมายเหตุ (บันทึกในบันทึกการใช้งาน)</span>
          </label>
          <textarea
            id={`${id}-note`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={300}
            className={cn(inputClass, "resize-y py-2 text-[13px]")}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="danger-solid"
              size="sm"
              disabled={act.isPending || c.reported.suspended}
              onClick={() => setConfirmSuspend(true)}
            >
              {reportActionLabels.suspend}
            </Button>
            <Button variant="danger" size="sm" disabled={act.isPending} onClick={() => act.mutate("hide_listing")}>
              {reportActionLabels.hide_listing}
            </Button>
            <Button variant="outline" size="sm" disabled={act.isPending} onClick={() => act.mutate("warn")}>
              {reportActionLabels.warn}
            </Button>
            <Button variant="outline" size="sm" disabled={act.isPending} onClick={() => act.mutate("dismiss")}>
              {reportActionLabels.dismiss}
            </Button>
            {tab === "open" && (
              <Button
                variant="ghost"
                size="sm"
                className="col-span-2"
                disabled={act.isPending}
                onClick={() => act.mutate("request_info")}
              >
                {reportActionLabels.request_info}
              </Button>
            )}
          </div>
          {act.isError && (
            <FormAlert>
              {act.error instanceof ApiError && act.error.status === 409
                ? "เรื่องนี้ถูกปิดไปแล้ว"
                : "ดำเนินการไม่สำเร็จ ลองอีกครั้ง"}
            </FormAlert>
          )}
          <p className="text-xs text-slate">ระงับบัญชีแล้ว ระบบจะแจ้งผู้ที่เคยแชตกับบัญชีนี้ใน 30 วันโดยอัตโนมัติ</p>
          <SuspendDialog
            c={c}
            open={confirmSuspend}
            onOpenChange={setConfirmSuspend}
            onConfirm={() => act.mutate("suspend")}
            pending={act.isPending}
          />
        </>
      )}
    </aside>
  );
}

/** E4: user reports by severity, with a detail panel and actions (hide, warn, suspend). */
export function ReportsView() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = tabs.find((t) => t.value === params.get("tab"))?.value ?? "open";
  const now = useNow(60_000);
  const { data, isPending, isError, refetch, isFetching } = useQuery(reportCasesQuery(tab));
  const rows = data?.data ?? [];
  // The chosen case, or the first in the list.
  const current = rows.find((c) => c.id === params.get("case")) ?? rows[0];

  return (
    <>
      <AdminPageHeader title="รายงานจากผู้ใช้" description="เรื่องระดับสูงต้องปิดภายใน 4 ชม." />
      <AdminTabs
        label="สถานะรายงาน"
        current={tab}
        tabs={tabs.map((t) => ({ ...t, count: t.value === "closed" ? undefined : data?.counts[t.value] }))}
        href={(t) => caseHref(t)}
      />
      {isPending ? (
        <div
          role="status"
          aria-label="กำลังโหลดรายงาน"
          className="flex flex-col gap-2 rounded-lg border border-line bg-white p-4"
        >
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : isError ? (
        <QueryError what="รายงาน" onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
          <DataTable
            caption="รายงานจากผู้ใช้"
            columns={columns(tab, current?.id, now)}
            rows={rows}
            getRowId={(c) => c.id}
            currentRowId={current?.id}
            onRowClick={(c) => router.replace(caseHref(tab, c.id), { scroll: false })}
            empty={<p className="py-10 text-center text-slate">ไม่มีรายงานในแท็บนี้</p>}
          />
          {current && <CaseDetail key={current.id} c={current} tab={tab} />}
        </div>
      )}
    </>
  );
}

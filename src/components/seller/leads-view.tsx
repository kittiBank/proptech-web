"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, MessageCircle, Phone, TriangleAlert, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { DomainStatus, StatusPill } from "@/components/ui/status-pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarLink } from "@/components/viewing/viewing-request-card";
import { useUpdateViewing } from "@/components/viewing/use-viewing-actions";
import { routes } from "@/data/navigation";
import { appointmentsQuery, sellerQueries } from "@/lib/api/queries";
import { formatTimeAgo } from "@/lib/format";
import {
  calendarEntries,
  clashesWithConfirmed,
  formatCountdown,
  formatRange,
  hoursUntil,
  shiftWeek,
  weekRangeLabel,
  weekStart,
  weekdayLabel,
} from "@/lib/seller";
import { viewingStatuses } from "@/lib/status";
import { formatSlot, slotParts } from "@/lib/viewing";
import { cn } from "@/lib/utils";
import type { AppointmentDto, LeadChannel } from "@/types/api";
import { AvailabilityDialog, ProposeTimeDialog } from "./lead-dialogs";

type LeadTab = "requests" | "confirmed" | "leads" | "past";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}

function BuyerHeader({ a, aside }: { a: AppointmentDto; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <h3 className="font-semibold text-ink">{a.counterpart.name}</h3>
      {a.counterpart.phoneVerified && (
        <StatusPill tone="success" className="h-5 px-2 text-[11px]">
          ยืนยันเบอร์แล้ว
        </StatusPill>
      )}
      {aside && <span className="ml-auto text-xs font-medium">{aside}</span>}
    </div>
  );
}

/** C10 request card: who, which listing, the times asked for, and the lister's answers. */
function RequestCard({
  a,
  all,
  onPropose,
}: {
  a: AppointmentDto;
  all: AppointmentDto[];
  onPropose: (a: AppointmentDto) => void;
}) {
  const update = useUpdateViewing();
  const clash = a.status === "requested" && clashesWithConfirmed(a, all);
  const backupClash = a.backupSlot && clashesWithConfirmed({ ...a, slot: a.backupSlot }, all);
  const urgent = hoursUntil(a.expiresAt) <= 6;
  const busy = update.isPending;

  const aside =
    a.status === "counter_proposed" ? (
      <span className="text-slate">รอผู้สนใจตอบ</span>
    ) : clash ? (
      <span className="inline-flex items-center gap-1 text-warning">
        <TriangleAlert className="size-3.5" aria-hidden="true" />
        ชนกับนัดที่ยืนยันแล้ว
      </span>
    ) : (
      <span className={urgent ? "text-danger" : "text-slate"}>หมดอายุใน {formatCountdown(a.expiresAt)}</span>
    );

  return (
    <li>
      <article
        aria-label={`คำขอจาก ${a.counterpart.name}`}
        className="flex gap-3 rounded-[10px] border border-line bg-white px-4 py-4 sm:px-5"
      >
        <Avatar name={a.counterpart.name} size="md" />
        <div className="min-w-0 flex-1">
          <BuyerHeader a={a} aside={aside} />
          {a.listing && (
            <p className="text-[13px] text-slate">
              <Link href={a.listing.href} className="hover:text-ink hover:underline">
                {a.listing.title}
              </Link>
            </p>
          )}
          <dl className="mt-2.5 grid grid-cols-2 gap-x-7 gap-y-1 sm:flex sm:flex-wrap">
            <Field label="เวลาที่ขอ">
              <b className={cn("font-semibold", clash && "text-warning")}>{formatSlot(a.slot, "short")}</b>
            </Field>
            <Field label="เวลาสำรอง">{a.backupSlot ? formatSlot(a.backupSlot, "short") : "–"}</Field>
            <Field label="ผู้เข้าชม">{a.partySize} คน</Field>
            {a.status === "counter_proposed" && a.proposedSlot && (
              <Field label="คุณเสนอ">
                <b className="font-semibold">{formatSlot(a.proposedSlot, "short")}</b>
              </Field>
            )}
          </dl>
          {a.note && <p className="mt-2.5 rounded-md bg-mist px-3 py-2.5 text-sm text-ink">“{a.note}”</p>}

          <div className="mt-3.5 flex flex-wrap gap-2">
            {a.status === "requested" && (
              <>
                <Button
                  size="base"
                  disabled={busy || clash}
                  onClick={() => update.mutate({ id: a.id, action: "confirm" })}
                >
                  ยืนยัน {formatSlot(a.slot, "short")}
                </Button>
                {a.backupSlot && (
                  <Button
                    variant="outline"
                    size="base"
                    disabled={busy || Boolean(backupClash)}
                    onClick={() => update.mutate({ id: a.id, action: "confirm", slot: a.backupSlot })}
                  >
                    ยืนยันเวลาสำรอง
                  </Button>
                )}
                <Button variant="outline" size="base" disabled={busy} onClick={() => onPropose(a)}>
                  เสนอเวลาอื่น
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="base"
              className="text-slate"
              disabled={busy}
              onClick={() => update.mutate({ id: a.id, action: "decline" })}
            >
              ปฏิเสธ<span className="sr-only"> คำขอของ {a.counterpart.name}</span>
            </Button>
            <Button asChild variant="ghost" size="base" className="sm:ml-auto">
              <Link href={routes.thread(a.threadId)}>
                <MessageCircle aria-hidden="true" />
                แชต<span className="sr-only">กับ {a.counterpart.name}</span>
              </Link>
            </Button>
          </div>
        </div>
      </article>
    </li>
  );
}

/** Confirmed or past viewing: time, buyer, listing and status. */
function AppointmentRow({ a }: { a: AppointmentDto }) {
  const title = a.listing?.title ?? "ดูทรัพย์";
  return (
    <li>
      <article
        aria-label={`${a.counterpart.name} ${formatSlot(a.slot)}`}
        className="flex gap-3 rounded-[10px] border border-line bg-white px-4 py-4 sm:px-5"
      >
        <Avatar name={a.counterpart.name} size="md" />
        <div className="min-w-0 flex-1">
          <BuyerHeader a={a} aside={<DomainStatus info={viewingStatuses[a.status]} />} />
          {a.listing && <p className="text-[13px] text-slate">{a.listing.title}</p>}
          <p className="mt-1.5 text-sm text-ink">
            <b className="font-semibold">{formatSlot(a.slot)}</b> · {a.partySize} คน
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4">
            {a.status === "confirmed" && <CalendarLink viewing={a} title={title} />}
            <Link
              href={routes.thread(a.threadId)}
              className="inline-flex min-h-9 items-center text-sm font-medium text-brand-strong underline-offset-4 hover:underline"
            >
              ส่งข้อความ<span className="sr-only">ถึง {a.counterpart.name}</span>
            </Link>
          </div>
        </div>
      </article>
    </li>
  );
}

const channelInfo: Record<LeadChannel, { label: string; icon: typeof Phone }> = {
  call: { label: "โทร", icon: Phone },
  chat: { label: "แชต", icon: MessageCircle },
  line: { label: "LINE", icon: MessageCircle },
};

function LeadsList() {
  const { data, isPending, isError, refetch, isFetching } = useQuery(sellerQueries.leads);
  if (isPending) return <Skeleton className="h-64 w-full rounded-[10px]" />;
  if (isError) return <QueryError what="รายชื่อผู้สนใจ" onRetry={() => refetch()} retrying={isFetching} />;
  if (!data.length) {
    return (
      <EmptyState
        icon={Users}
        title="ยังไม่มีผู้สนใจ"
        body="เมื่อมีคนโทร แชต หรือทัก LINE จากประกาศของคุณ จะแสดงที่นี่"
        className="rounded-[10px] bg-white"
      />
    );
  }
  return (
    <ul aria-label="ผู้สนใจทั้งหมด" className="divide-y divide-line rounded-[10px] border border-line bg-white">
      {data.map((lead) => {
        const { label, icon: Icon } = channelInfo[lead.channel];
        return (
          <li key={lead.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={lead.name} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                {lead.name}
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate">
                  <Icon className="size-3.5" aria-hidden="true" />
                  {label}
                </span>
              </p>
              <p className="truncate text-[13px] text-slate">
                {lead.listingTitle} · {formatTimeAgo(lead.createdAt)}
              </p>
            </div>
            {lead.threadId && (
              <Button asChild variant="outline" size="sm">
                <Link href={routes.thread(lead.threadId)}>
                  เปิดแชต<span className="sr-only">กับ {lead.name}</span>
                </Link>
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function WeekCalendar({ viewings }: { viewings: AppointmentDto[] }) {
  const [monday, setMonday] = useState(() => weekStart(new Date().toISOString()));
  const days = calendarEntries(viewings, monday);
  const today = slotParts(new Date().toISOString()).date;
  const total = days.reduce((s, d) => s + d.items.length, 0);

  return (
    <section aria-labelledby="week-calendar" className="rounded-[10px] border border-line bg-white p-4 sm:p-[18px]">
      <div className="flex items-center justify-between gap-2">
        <h2 id="week-calendar" className="text-[17px] font-semibold text-ink">
          ตารางนัด {weekRangeLabel(monday)}
        </h2>
        <span className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            aria-label="สัปดาห์ก่อน"
            onClick={() => setMonday(shiftWeek(monday, -1))}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            aria-label="สัปดาห์ถัดไป"
            onClick={() => setMonday(shiftWeek(monday, 1))}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        สัปดาห์นี้มี {total} นัด
      </p>
      <ol className="mt-3 grid grid-cols-7 overflow-hidden rounded-md border border-line">
        {days.map((d, i) => (
          <li
            key={d.date}
            aria-label={`${weekdayLabel(d.date)} ${d.items.length ? `${d.items.length} นัด` : "ไม่มีนัด"}`}
            className={cn(
              "min-h-[150px] min-w-0 px-1 py-2",
              i > 0 && "border-l border-line",
              i >= 5 && "bg-[#FAF8FF]",
              d.date === today && "bg-brand-soft",
            )}
          >
            <span className={cn("text-xs font-medium", d.date === today ? "text-violet-700" : "text-slate")}>
              {weekdayLabel(d.date)}
            </span>
            <ul>
              {d.items.map((v) => (
                <li
                  key={v.id}
                  className={cn(
                    "mt-1 rounded-[3px] border-l-[3px] px-1 py-1 text-[11px] leading-snug break-words",
                    v.status === "confirmed" ? "border-brand bg-brand-soft" : "border-warning-line bg-warning-soft",
                  )}
                >
                  <b className="block font-semibold tabular-nums">{slotParts(v.slot).time}</b>
                  <span className="line-clamp-2">{v.listing?.title ?? v.counterpart.name}</span>
                  <span className="sr-only">
                    {" "}
                    {viewingStatuses[v.status].label} กับ {v.counterpart.name}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <p className="mt-2.5 flex gap-3.5 text-xs text-slate" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-brand" /> ยืนยันแล้ว
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-warning-line" /> รอยืนยัน
        </span>
      </p>
    </section>
  );
}

function AvailabilityCard() {
  const { data } = useQuery(sellerQueries.availability);
  const [editing, setEditing] = useState(false);
  return (
    <section aria-labelledby="availability" className="rounded-[10px] border border-line bg-white p-4 sm:p-[18px]">
      <h2 id="availability" className="text-[17px] font-semibold text-ink">
        เวลารับนัด
      </h2>
      <p className="text-sm text-slate">ผู้หาบ้านเลือกได้เฉพาะช่วงนี้</p>
      {data ? (
        <>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt>จันทร์ ถึง ศุกร์</dt>
              <dd className="font-medium tabular-nums">{formatRange(data.weekdays)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>เสาร์ อาทิตย์</dt>
              <dd className="font-medium tabular-nums">{formatRange(data.weekend)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>เว้นระหว่างนัด</dt>
              <dd className="font-medium tabular-nums">{data.gapMinutes ? `${data.gapMinutes} นาที` : "ไม่เว้น"}</dd>
            </div>
          </dl>
          <Button variant="outline" size="base" className="mt-3.5 w-full" onClick={() => setEditing(true)}>
            แก้ไขเวลารับนัด
          </Button>
          <AvailabilityDialog open={editing} value={data} onClose={() => setEditing(false)} />
        </>
      ) : (
        <Skeleton className="mt-3 h-24 w-full" />
      )}
    </section>
  );
}

/** `/dashboard/leads` (C10): answer viewing requests, see the week, set viewing hours. */
export function LeadsView() {
  const { data, isPending, isError, refetch, isFetching } = useQuery(appointmentsQuery);
  const { data: leads } = useQuery(sellerQueries.leads);
  const [tab, setTab] = useState<LeadTab>("requests");
  const [proposing, setProposing] = useState<AppointmentDto | null>(null);

  const mine = (data?.data ?? []).filter((a) => a.role === "lister");
  const requests = mine
    .filter((a) => a.status === "requested" || a.status === "counter_proposed")
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  const confirmed = mine.filter((a) => a.status === "confirmed").sort((a, b) => a.slot.localeCompare(b.slot));
  const past = mine
    .filter((a) => !["requested", "counter_proposed", "confirmed"].includes(a.status))
    .sort((a, b) => b.slot.localeCompare(a.slot));

  const tabs: { value: LeadTab; label: string; count?: number }[] = [
    { value: "requests", label: "คำขอนัดดู", count: requests.length },
    { value: "confirmed", label: "นัดที่ยืนยันแล้ว", count: confirmed.length },
    { value: "leads", label: "ผู้สนใจทั้งหมด", count: leads?.length },
    { value: "past", label: "ที่ผ่านมา" },
  ];

  const list = (items: AppointmentDto[], empty: string) =>
    items.length === 0 ? (
      <EmptyState
        icon={CalendarDays}
        title={empty}
        body="ผู้หาบ้านขอนัดได้จากหน้าประกาศหรือในแชต ตั้งเวลารับนัดไว้ให้ตรงกับที่สะดวก"
        className="rounded-[10px] bg-white"
      />
    ) : (
      <ul className="flex flex-col gap-3">
        {items.map((a) => (
          <AppointmentRow key={a.id} a={a} />
        ))}
      </ul>
    );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.015em] text-ink sm:text-[28px]">ผู้สนใจและนัดหมาย</h1>
        <p className="mt-1 text-slate">จัดการคำขอนัดดูทรัพย์ และติดตามผู้สนใจจากทุกช่องทาง</p>
      </div>

      {isPending ? (
        <div role="status" aria-label="กำลังโหลดคำขอนัด" className="flex flex-col gap-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-44 w-full rounded-[10px]" />
        </div>
      ) : isError ? (
        <QueryError what="คำขอนัด" onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as LeadTab)}>
          <TabsList className="gap-[22px] overflow-x-auto border-b border-line">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="shrink-0 text-sm whitespace-nowrap">
                {t.label}
                {t.count !== undefined && <span className="font-normal tabular-nums">{t.count}</span>}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="min-w-0">
              <TabsContent value="requests" className="flex flex-col gap-3">
                <p className="text-sm text-slate">
                  ผู้หาบ้านเป็นคนส่งคำขอนัด คุณยืนยันหรือเสนอเวลาใหม่ได้ ถ้าไม่ตอบใน 24 ชม. คำขอจะหมดอายุ
                  และนับในอัตราการตอบกลับ
                </p>
                {requests.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title="ไม่มีคำขอที่รอคุณตอบ"
                    body="คำขอนัดใหม่จะแสดงที่นี่ พร้อมแจ้งเตือนในแชต"
                    className="rounded-[10px] bg-white"
                  />
                ) : (
                  <ul className="flex flex-col gap-3">
                    {requests.map((a) => (
                      <RequestCard key={a.id} a={a} all={mine} onPropose={setProposing} />
                    ))}
                  </ul>
                )}
              </TabsContent>
              <TabsContent value="confirmed">{list(confirmed, "ยังไม่มีนัดที่ยืนยันแล้ว")}</TabsContent>
              <TabsContent value="leads">
                <LeadsList />
              </TabsContent>
              <TabsContent value="past">{list(past, "ยังไม่มีนัดที่ผ่านมา")}</TabsContent>
            </div>
            <aside aria-label="ตารางนัดและเวลารับนัด" className="flex flex-col gap-4">
              <WeekCalendar viewings={mine} />
              <AvailabilityCard />
            </aside>
          </div>
        </Tabs>
      )}

      <ProposeTimeDialog request={proposing} onClose={() => setProposing(null)} />
    </div>
  );
}

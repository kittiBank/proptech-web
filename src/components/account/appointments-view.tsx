"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { PropertyPhoto } from "@/components/property/property-photo";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { DomainStatus } from "@/components/ui/status-pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarLink } from "@/components/viewing/viewing-request-card";
import { useUpdateViewing } from "@/components/viewing/use-viewing-actions";
import { routes } from "@/data/navigation";
import { appointmentsQuery } from "@/lib/api/queries";
import { viewingStatuses } from "@/lib/status";
import { appointmentTab, dayBox, formatSlot, slotParts, type AppointmentTab } from "@/lib/viewing";
import { formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppointmentDto } from "@/types/api";

const tabs: { value: AppointmentTab; label: string; empty: string }[] = [
  { value: "upcoming", label: "กำลังจะถึง", empty: "ยังไม่มีนัดที่ยืนยันแล้ว" },
  { value: "pending", label: "รอยืนยัน", empty: "ไม่มีคำขอที่รอคำตอบ" },
  { value: "past", label: "ที่ผ่านมา", empty: "ยังไม่มีนัดที่ผ่านมา" },
  { value: "cancelled", label: "ยกเลิกแล้ว", empty: "ไม่มีนัดที่ยกเลิก" },
];

const kindLabel = {
  agent: "นายหน้า",
  owner: "เจ้าของ",
  developer: "ฝ่ายขาย",
  buyer: "ผู้สนใจ",
  support: "ทีมงาน",
} as const;

function AppointmentCard({ a }: { a: AppointmentDto }) {
  const update = useUpdateViewing();
  const box = dayBox(a.slot);
  const title = a.listing?.title ?? a.counterpart.name;
  const thread = routes.thread(a.threadId);
  const note =
    a.status === "requested"
      ? `ส่งคำขอเมื่อ${formatTimeAgo(a.createdAt)} ถ้าไม่มีคำตอบใน 24 ชม. คำขอจะหมดอายุ`
      : a.status === "counter_proposed" && a.proposedSlot
        ? `ผู้ลงประกาศเสนอเวลาใหม่: ${formatSlot(a.proposedSlot)}`
        : a.status === "expired"
          ? "ผู้ลงประกาศไม่ได้ตอบภายใน 24 ชม. ลองเลือกเวลาใหม่"
          : `ผู้เข้าชม ${a.partySize} คน${a.note ? ` · “${a.note}”` : ""}`;
  const pending = a.status === "requested" || a.status === "counter_proposed";

  return (
    <li>
      <article
        aria-label={`${title} ${formatSlot(a.slot)}`}
        className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-4 gap-y-3 rounded-[10px] border border-line bg-white p-4 sm:grid-cols-[76px_120px_minmax(0,1fr)_180px] sm:items-center sm:gap-5 sm:p-5"
      >
        <div className="rounded-lg border border-line py-2 text-center leading-tight" aria-hidden="true">
          <span className="block text-xs text-slate">{box.weekday}</span>
          <span className="block text-[26px] font-semibold text-ink">{box.day}</span>
          <span className="block text-xs text-slate">{box.month}</span>
        </div>
        {a.listing ? (
          <PropertyPhoto image={a.listing.image} sizes="120px" className="hidden h-[84px] rounded-md sm:block" />
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <DomainStatus info={viewingStatuses[a.status]} />
            <span className="text-sm font-semibold text-ink tabular-nums">{slotParts(a.slot).time}</span>
            <span className="sr-only">{formatSlot(a.slot)}</span>
          </p>
          <h2 className="mt-1.5 font-semibold text-ink">
            {a.listing ? (
              <Link href={a.listing.href} className="hover:text-brand-strong hover:underline">
                {a.listing.title}
              </Link>
            ) : (
              title
            )}
            {a.listing && <span className="font-normal text-slate tabular-nums"> · {a.listing.priceLabel}</span>}
          </h2>
          <p className="text-sm text-slate">
            กับ {a.counterpart.name} ({kindLabel[a.counterpart.kind]})
          </p>
          <p className={cn("mt-0.5 text-[13px]", pending ? "text-warning" : "text-slate")}>{note}</p>
        </div>
        <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1 sm:flex-col sm:items-stretch">
          {a.status === "confirmed" && (
            <Button asChild variant="outline" size="base">
              <CalendarLink viewing={a} title={title} className="justify-center no-underline hover:no-underline" />
            </Button>
          )}
          {a.status === "counter_proposed" && (
            <Button
              size="base"
              disabled={update.isPending}
              onClick={() => update.mutate({ id: a.id, action: "accept" })}
            >
              รับเวลาใหม่
            </Button>
          )}
          {a.status === "requested" && (
            <Button
              variant="danger"
              size="base"
              disabled={update.isPending}
              onClick={() => update.mutate({ id: a.id, action: "cancel" })}
            >
              ยกเลิกคำขอ
            </Button>
          )}
          <Button asChild variant="ghost" size="base">
            <Link href={thread}>ส่งข้อความ</Link>
          </Button>
        </div>
      </article>
    </li>
  );
}

/** `/account/appointments` (B17): the buyer's viewings by tab, with the actions each status allows. */
export function AppointmentsView() {
  const { data, isPending, isError, isFetching, refetch } = useQuery(appointmentsQuery);
  const [tab, setTab] = useState<AppointmentTab>("upcoming");
  const mine = (data?.data ?? []).filter((a) => a.role === "buyer");
  const byTab = (t: AppointmentTab) =>
    mine
      .filter((a) => appointmentTab(a.status) === t)
      // Past and cancelled read newest first.
      .sort((x, y) =>
        t === "upcoming" || t === "pending" ? x.slot.localeCompare(y.slot) : y.slot.localeCompare(x.slot),
      );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.015em] text-ink sm:text-[30px]">นัดดูทรัพย์ของฉัน</h1>
        <p className="mt-1 text-slate">
          ส่งคำขอนัดได้จากหน้าประกาศหรือในแชต ผู้ลงประกาศจะยืนยัน หรือเสนอเวลาใหม่กลับมา
        </p>
      </div>

      {isPending ? (
        <div role="status" aria-label="กำลังโหลดนัดดูทรัพย์" className="flex flex-col gap-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-32 w-full rounded-[10px]" />
        </div>
      ) : isError ? (
        <QueryError what="นัดดูทรัพย์" onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as AppointmentTab)}>
          <TabsList className="gap-6 overflow-x-auto border-b border-line">
            {tabs.map((t) => {
              const count = byTab(t.value).length;
              return (
                <TabsTrigger key={t.value} value={t.value} className="shrink-0 whitespace-nowrap">
                  {t.label}
                  {(t.value === "upcoming" || t.value === "pending") && count > 0 && (
                    <span className="text-[13px] font-normal text-slate tabular-nums">{count}</span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {tabs.map((t) => {
            const items = byTab(t.value);
            return (
              <TabsContent key={t.value} value={t.value} forceMount hidden={tab !== t.value} className="mt-4">
                {items.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title={t.empty}
                    body="ทักผู้ลงประกาศในแชตแล้วกด “ขอนัดดูห้อง” เลือกวันเวลาที่สะดวกได้เลย"
                    action={
                      <Button asChild>
                        <Link href={routes.messages}>ไปที่ข้อความ</Link>
                      </Button>
                    }
                    className="rounded-lg bg-white"
                  />
                ) : (
                  <ul className="flex flex-col gap-3">
                    {items.map((a) => (
                      <AppointmentCard key={a.id} a={a} />
                    ))}
                  </ul>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <Callout
        tone="info"
        title="เคล็ดลับก่อนไปดูทรัพย์"
        className="rounded-[10px] border-l-0 bg-white ring-1 ring-line"
      >
        ขอดูโฉนดหรือหนังสือสัญญาเช่าตัวจริง ตรวจชื่อเจ้าของให้ตรงกับบัตรประชาชน และอย่าโอนมัดจำก่อนได้ดูห้องจริง
      </Callout>
    </div>
  );
}

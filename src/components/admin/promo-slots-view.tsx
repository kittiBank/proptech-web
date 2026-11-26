"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FormAlert, TextField } from "@/components/ui/field";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/components/ui/toast";
import { adminRoutes } from "@/lib/admin";
import { adminApi, promoSlotsQuery } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MovePinConflict, PromoDayDto, PromoPinDto, PromoSettingsDto } from "@/types/api";
import { AdminCard } from "./admin-dashboard";
import { AdminPageHeader } from "./admin-shell";
import { useAfterDecision } from "./admin-ui";

const noon = (day: string) => new Date(`${day}T12:00:00+07:00`);
/** "จ. 17" as on E8 (Intl's short Thai weekday is the full word). */
const weekdays = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const dayLabel = { format: (d: Date) => `${weekdays[d.getUTCDay()]} ${Number(d.toISOString().slice(8, 10))}` };
const shortDate = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
const addDays = (day: string, n: number) => {
  const d = noon(day);
  d.setUTCDate(d.getUTCDate() + n);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d);
};
const range = (start: string, end: string) => `${shortDate.format(noon(start))} ถึง ${shortDate.format(noon(end))}`;
const weekHref = (day: string) => `${adminRoutes.promoSlots}?week=${day}`;

function DayRow({ day, reserved }: { day: PromoDayDto; reserved: number }) {
  const used = day.sold + day.partner;
  const label = `${dayLabel.format(noon(day.date))}: ขายแล้ว ${day.sold} พาร์ทเนอร์ ${day.partner} จาก ${day.capacity} ช่อง (สำรองพาร์ทเนอร์ ${reserved})`;
  return (
    <li className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-[13px] text-slate">{dayLabel.format(noon(day.date))}</span>
      <span role="img" aria-label={label} className="grid flex-1 grid-cols-12 gap-1 lg:grid-cols-24">
        {Array.from({ length: day.capacity }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-5 rounded-[3px]",
              i < day.sold ? "bg-brand" : i < used ? "bg-violet-700" : "border border-line-strong bg-white",
            )}
          />
        ))}
      </span>
      <span className="w-12 shrink-0 text-right text-[13px] font-medium tabular-nums">
        {used}/{day.capacity}
      </span>
    </li>
  );
}

function MoveDialog({ pin, onClose }: { pin: PromoPinDto | null; onClose: () => void }) {
  const id = useId();
  const [start, setStart] = useState("");
  const refresh = useAfterDecision(["admin", "promo-slots"]);
  const move = useMutation({
    mutationFn: () => adminApi.movePin(pin!.id, start),
    onSuccess: () => {
      toast(`ย้ายวันปักหมุด ${pin!.listing.code} แล้ว`);
      refresh();
      onClose();
    },
  });
  const conflict =
    move.error instanceof ApiError && move.error.status === 409
      ? (move.error.body as unknown as MovePinConflict)
      : undefined;
  const length = pin ? Math.round((noon(pin.end).getTime() - noon(pin.start).getTime()) / 86_400_000) : 0;

  return (
    <Dialog
      open={pin !== null}
      onOpenChange={(open) => {
        if (!open) {
          move.reset();
          setStart("");
          onClose();
        }
      }}
    >
      <DialogContent className="sm:w-[440px]">
        {pin && (
          <form
            className="flex flex-col gap-3 p-6"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (start) move.mutate();
            }}
          >
            <DialogTitle className="pr-10 text-lg font-semibold text-ink">
              ย้ายวันปักหมุด {pin.listing.code}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate">
              ตอนนี้ {range(pin.start, pin.end)} · ระยะเวลาเท่าเดิม {length + 1} วัน
            </DialogDescription>
            <TextField
              id={`${id}-start`}
              type="date"
              label="วันเริ่มใหม่"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              hint={start ? `ถึง ${shortDate.format(noon(addDays(start, length)))}` : undefined}
              required
            />
            {move.isError && (
              <FormAlert>
                {conflict
                  ? conflict.reason === "full"
                    ? `วันที่ ${shortDate.format(noon(conflict.day))} เต็มแล้ว เลือกวันอื่น`
                    : `วันที่ ${shortDate.format(noon(conflict.day))} เขต${pin.listing.district.split(" ")[0]} ปักหมุดครบตามที่กำหนดแล้ว`
                  : "ย้ายไม่สำเร็จ ลองอีกครั้ง"}
              </FormAlert>
            )}
            <div className="mt-1 flex justify-end gap-2">
              <Button type="button" variant="outline" size="base" onClick={onClose}>
                ยกเลิก
              </Button>
              <Button type="submit" size="base" disabled={!start || move.isPending}>
                ย้ายวัน
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

const settingFields: { key: keyof PromoSettingsDto; label: string; suffix?: string }[] = [
  { key: "priceWeek", label: "ราคา 7 วัน", suffix: "฿" },
  { key: "slotsPerDay", label: "ช่องต่อวัน" },
  { key: "partnerReserved", label: "สำรองให้พาร์ทเนอร์ (ช่องต่อวัน)" },
  { key: "districtCap", label: "ห้ามซ้ำเขตต่อวัน (ไม่เกิน)" },
];

function SettingsDialog({
  settings,
  open,
  onClose,
}: {
  settings: PromoSettingsDto;
  open: boolean;
  onClose: () => void;
}) {
  const id = useId();
  const [values, setValues] = useState(settings);
  const refresh = useAfterDecision(["admin", "promo-slots"]);
  const save = useMutation({
    mutationFn: () => adminApi.updatePromoSettings(values),
    onSuccess: () => {
      toast("บันทึกการตั้งค่าแล้ว");
      refresh();
      onClose();
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          save.reset();
          setValues(settings);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:w-[440px]">
        <form
          className="flex flex-col gap-3 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <DialogTitle className="pr-10 text-lg font-semibold text-ink">ตั้งค่าราคาและจำนวน</DialogTitle>
          <DialogDescription className="text-sm text-slate">
            มีผลกับการซื้อใหม่ ประกาศที่ปักหมุดอยู่ไม่เปลี่ยน
          </DialogDescription>
          {settingFields.map((f) => (
            <TextField
              key={f.key}
              id={`${id}-${f.key}`}
              type="number"
              inputMode="numeric"
              label={f.label}
              suffix={f.suffix}
              value={String(values[f.key])}
              onChange={(e) => setValues({ ...values, [f.key]: Number(e.target.value) })}
              min={0}
              required
            />
          ))}
          {save.isError && (
            <FormAlert>
              {save.error instanceof ApiError && save.error.status === 400
                ? "ค่าไม่ถูกต้อง: ช่องสำรองต้องน้อยกว่าช่องต่อวัน และเพดานต่อเขตต้องไม่เกินช่องต่อวัน"
                : "บันทึกไม่สำเร็จ ลองอีกครั้ง"}
            </FormAlert>
          )}
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="outline" size="base" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" size="base" disabled={save.isPending}>
              บันทึก
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** E8: homepage pins, 24 slots a day. Week grid, active pins and the slot rules. */
export function PromoSlotsView() {
  const params = useSearchParams();
  const week = params.get("week") ?? undefined;
  const { data, isPending, isError, refetch, isFetching } = useQuery(promoSlotsQuery(week));
  const [moving, setMoving] = useState<PromoPinDto | null>(null);
  const [editing, setEditing] = useState(false);

  if (isPending) {
    return (
      <>
        <AdminPageHeader title="ช่องปักหมุดหน้าแรก" description="จัดการสินค้าที่มีจำนวนจำกัด" />
        <Skeleton className="h-72 rounded-lg" />
      </>
    );
  }
  if (isError) {
    return (
      <>
        <AdminPageHeader title="ช่องปักหมุดหน้าแรก" />
        <QueryError what="ช่องปักหมุด" onRetry={() => refetch()} retrying={isFetching} />
      </>
    );
  }

  const { weekStart, days, pins, settings } = data.data;
  const weekEnd = addDays(weekStart, 6);
  const capacity = days.reduce((n, d) => n + d.capacity, 0);
  const used = days.reduce((n, d) => n + d.sold + d.partner, 0);

  const columns: DataColumn<PromoPinDto>[] = [
    {
      id: "listing",
      header: "ประกาศ",
      cell: (p) => (
        <>
          <b className="block font-semibold">{p.listing.title}</b>
          <span className="text-xs text-slate">
            {p.listing.code} · {p.listing.district}
          </span>
        </>
      ),
    },
    { id: "buyer", header: "ผู้ซื้อ", cell: (p) => p.buyer },
    { id: "range", header: "ช่วงวัน", cell: (p) => <span className="whitespace-nowrap">{range(p.start, p.end)}</span> },
    {
      id: "source",
      header: "ที่มา",
      cell: (p) => (
        <StatusPill tone={p.source === "purchase" ? "violet" : "neutral"} className="h-5 px-2 text-[11px]">
          {p.source === "purchase" ? "ซื้อ" : "สัญญาพาร์ทเนอร์"}
        </StatusPill>
      ),
    },
    {
      id: "move",
      header: <span className="sr-only">การดำเนินการ</span>,
      align: "right",
      cell: (p) => (
        <Button variant="outline" size="sm" aria-label={`ย้ายวัน ${p.listing.code}`} onClick={() => setMoving(p)}>
          ย้ายวัน
        </Button>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader title="ช่องปักหมุดหน้าแรก" description="จัดการสินค้าที่มีจำนวนจำกัด" />
      <section aria-labelledby="week-title" className="rounded-lg border border-line bg-white p-[18px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="week-title" className="text-[15px] font-semibold">
              ช่องปักหมุดหน้าแรก {range(weekStart, weekEnd)}
            </h2>
            <p className="mt-0.5 text-[13px] text-slate">{settings.slotsPerDay} ช่องต่อวัน</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={weekHref(addDays(weekStart, -7))} scroll={false}>
                <ChevronLeft aria-hidden="true" />
                สัปดาห์ก่อน
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={weekHref(addDays(weekStart, 7))} scroll={false}>
                สัปดาห์ถัดไป
                <ChevronRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {days.map((d) => (
            <DayRow key={d.date} day={d} reserved={settings.partnerReserved} />
          ))}
        </ul>
        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 rounded-[3px] bg-brand" />
            ขายแล้ว
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 rounded-[3px] bg-violet-700" />
            พาร์ทเนอร์
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 rounded-[3px] border border-line-strong bg-white" />
            ว่าง
          </span>
          <span className="ml-auto">
            ใช้แล้ว {formatNumber(used)} จาก {formatNumber(capacity)} ช่อง (
            {capacity ? Math.round((used / capacity) * 100) : 0}%) · วันที่เต็มผู้ซื้อจะเห็น “เต็ม” และเลือกวันถัดไปได้
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="pins-title" className="overflow-hidden rounded-lg border border-line bg-white">
          <h2 id="pins-title" className="px-4 py-3 text-[15px] font-semibold">
            ประกาศที่ปักหมุดในสัปดาห์นี้
          </h2>
          <DataTable
            caption="ประกาศที่ปักหมุดในสัปดาห์นี้"
            columns={columns}
            rows={pins}
            getRowId={(p) => p.id}
            scrollClassName="max-h-[520px]"
            className="rounded-none border-x-0 border-b-0"
            empty={<p className="py-8 text-center text-slate">-</p>}
          />
        </section>
        <AdminCard title="ตั้งค่าราคาและจำนวน">
          <dl className="mt-3 grid grid-cols-[140px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
            <dt className="text-slate">ราคา 7 วัน</dt>
            <dd>฿{formatNumber(settings.priceWeek)}</dd>
            <dt className="text-slate">ช่องต่อวัน</dt>
            <dd>{settings.slotsPerDay} (ตรงกับหน้าแรก)</dd>
            <dt className="text-slate">สำรองให้พาร์ทเนอร์</dt>
            <dd>{settings.partnerReserved} ช่องต่อวัน</dd>
            <dt className="text-slate">ห้ามซ้ำเขตต่อวัน</dt>
            <dd>ไม่เกิน {settings.districtCap} ประกาศต่อเขต</dd>
          </dl>
          {/* Only Revenue and super admins can open this page (lib/admin.ts), so editing needs no extra check. */}
          <Button variant="outline" size="sm" className="mt-3.5" onClick={() => setEditing(true)}>
            แก้ไข
          </Button>
        </AdminCard>
      </div>
      <MoveDialog pin={moving} onClose={() => setMoving(null)} />
      {editing && <SettingsDialog settings={settings} open={editing} onClose={() => setEditing(false)} />}
    </>
  );
}

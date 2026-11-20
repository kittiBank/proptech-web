"use client";

import { useId, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { PropertyPhoto } from "@/components/property/property-photo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FormAlert, inputClass } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/query-state";
import { toast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { threadQueries } from "@/lib/api/queries";
import { formatDayLabel, formatSlot, slotIso } from "@/lib/viewing";
import { cn } from "@/lib/utils";
import type { ThreadDto } from "@/types/api";
import { DateSlotPicker, type SlotPick } from "./date-slot-picker";
import { useRefreshViewings } from "./use-viewing-actions";

const MAX_PARTY = 10;
const MAX_NOTE = 300;

const iso = (p: SlotPick) => slotIso(p.date, p.time);

function Form({ thread, onDone }: { thread: ThreadDto; onDone: () => void }) {
  const id = useId();
  const { data, isPending, isError, refetch } = useQuery(threadQueries.slots(thread.id));
  const refresh = useRefreshViewings();
  const firstFree = data?.days.find((d) => d.slots.some((s) => s.available))?.date;
  const [chosenDay, setDay] = useState<string>();
  const day = chosenDay ?? firstFree ?? "";
  const [primary, setPrimary] = useState<SlotPick | null>(null);
  const [backup, setBackup] = useState<SlotPick | null>(null);
  const [picking, setPicking] = useState<"primary" | "backup">("primary");
  const [party, setParty] = useState(2);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();

  const create = useMutation({
    mutationFn: () =>
      api.createViewing(thread.id, {
        slot: iso(primary!),
        backupSlot: backup ? iso(backup) : undefined,
        partySize: party,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      toast("ส่งคำขอนัดแล้ว ผู้ลงประกาศจะยืนยันในแชต");
      onDone();
    },
    onError: (e) =>
      setError(
        e instanceof ApiError && e.status === 409
          ? "มีคำขอนัดที่รอคำตอบอยู่แล้ว ยกเลิกคำขอเดิมก่อนส่งใหม่"
          : e instanceof ApiError && e.status === 400
            ? "เวลานี้ใช้ไม่ได้แล้ว ลองเลือกเวลาอื่น"
            : "ส่งคำขอไม่สำเร็จ ลองอีกครั้ง",
      ),
    onSettled: refresh,
  });

  const onPick = (p: SlotPick) => {
    setError(undefined);
    if (picking === "primary") setPrimary(p);
    else {
      setBackup(p);
      setPicking("primary");
    }
  };

  const listing = thread.listing!;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
        <div className="flex items-center gap-2.5 rounded-lg bg-mist p-2.5">
          <PropertyPhoto image={listing.image} sizes="48px" className="h-[38px] w-12 shrink-0 rounded-sm" />
          <p className="min-w-0 text-[13px] text-slate">
            <span className="block truncate font-semibold text-ink">{listing.title}</span>
            กับ {thread.counterpart.name} · รับนัด {listing.viewingHours}
          </p>
        </div>

        <h3 className="mt-[18px] mb-2 font-semibold text-ink">เลือกวันและเวลา</h3>
        {isPending ? (
          <div role="status" aria-label="กำลังโหลดเวลาว่าง" className="flex flex-col gap-3">
            <Skeleton className="h-[68px] w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError ? (
          <FormAlert>
            โหลดเวลาว่างไม่สำเร็จ{" "}
            <button type="button" className="font-semibold underline" onClick={() => refetch()}>
              ลองอีกครั้ง
            </button>
          </FormAlert>
        ) : (
          <DateSlotPicker
            days={data.days}
            day={day}
            onDayChange={setDay}
            primary={primary}
            backup={backup}
            picking={picking}
            onPick={onPick}
          />
        )}

        <div
          className={cn(
            "mt-3.5 flex items-center justify-between gap-3 rounded-lg border-[1.5px] border-dashed p-3 text-sm",
            picking === "backup" ? "border-brand bg-brand-soft" : "border-violet-200",
          )}
        >
          <span aria-live="polite">
            <span className="block font-semibold text-ink">เวลาสำรอง (ไม่บังคับ)</span>
            <span className="text-slate">
              {picking === "backup"
                ? "แตะเวลาด้านบนเพื่อตั้งเป็นเวลาสำรอง"
                : backup
                  ? formatSlot(iso(backup), "short")
                  : "เผื่อผู้ลงประกาศไม่สะดวกเวลาแรก"}
            </span>
          </span>
          <span className="flex shrink-0 gap-1">
            {backup && picking === "primary" && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setBackup(null)}>
                ลบ
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-brand-strong"
              disabled={!primary}
              onClick={() => setPicking(picking === "backup" ? "primary" : "backup")}
            >
              {picking === "backup" ? "เสร็จ" : backup ? "เปลี่ยน" : "เพิ่ม"}
            </Button>
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span id={`${id}-party`} className="font-semibold text-ink">
            ผู้เข้าชม
          </span>
          <span
            role="group"
            aria-labelledby={`${id}-party`}
            className="inline-flex items-center rounded-full border border-line-strong"
          >
            <button
              type="button"
              aria-label="ลดจำนวนผู้เข้าชม"
              disabled={party <= 1}
              onClick={() => setParty((n) => n - 1)}
              className="inline-flex size-11 items-center justify-center rounded-full text-ink disabled:opacity-40"
            >
              <Minus className="size-5" aria-hidden="true" />
            </button>
            <output aria-live="polite" className="w-8 text-center font-semibold tabular-nums">
              {party}
            </output>
            <button
              type="button"
              aria-label="เพิ่มจำนวนผู้เข้าชม"
              disabled={party >= MAX_PARTY}
              onClick={() => setParty((n) => n + 1)}
              className="inline-flex size-11 items-center justify-center rounded-full text-ink disabled:opacity-40"
            >
              <Plus className="size-5" aria-hidden="true" />
            </button>
          </span>
        </div>

        <label htmlFor={`${id}-note`} className="mt-4 mb-2 block font-semibold text-ink">
          ข้อความถึงผู้ลงประกาศ <span className="font-normal text-slate">(ไม่บังคับ)</span>
        </label>
        <textarea
          id={`${id}-note`}
          value={note}
          maxLength={MAX_NOTE}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="เช่น อยากดูห้องจริงกับส่วนกลาง และขอดูสัญญาด้วย"
          className={cn(inputClass, "resize-none py-2.5 text-sm")}
        />
        {error && (
          <FormAlert className="mt-3">
            <span>{error}</span>
          </FormAlert>
        )}
      </div>
      <footer className="border-t border-line px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-6">
        <p className="mb-2 text-center text-xs text-slate">
          ผู้ลงประกาศจะยืนยันหรือเสนอเวลาใหม่ในแชต คำขอหมดอายุใน 24 ชม.
        </p>
        <Button
          size="lg"
          className="h-[50px] w-full text-base font-semibold"
          disabled={!primary || create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending
            ? "กำลังส่ง…"
            : primary
              ? `ส่งคำขอนัด ${formatSlot(iso(primary), "short")}`
              : day
                ? `เลือกเวลาใน ${formatDayLabel(day)}`
                : "เลือกวันและเวลา"}
        </Button>
      </footer>
    </>
  );
}

/** B18: buyer asks for a viewing (day, time, backup time, party size, note). A bottom sheet on phones. */
export function RequestViewingDialog({
  thread,
  open,
  onOpenChange,
}: {
  thread: ThreadDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const id = useId();
  if (!thread.listing || thread.role !== "buyer") return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={`${id}-desc`}
        className="h-[min(92dvh,760px)] sm:w-[min(520px,calc(100vw-48px))]"
      >
        <div className="shrink-0 px-4 pt-4 pr-16 pb-3 sm:px-6">
          <DialogTitle className="text-[19px] font-semibold text-ink">ขอนัดดูห้อง</DialogTitle>
          <DialogDescription id={`${id}-desc`} className="sr-only">
            เลือกวัน เวลา และจำนวนผู้เข้าชม แล้วส่งคำขอให้ผู้ลงประกาศยืนยัน
          </DialogDescription>
        </div>
        {open && <Form thread={thread} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

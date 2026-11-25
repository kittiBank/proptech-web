"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { FilterSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DateSlotPicker, type SlotPick } from "@/components/viewing/date-slot-picker";
import { useUpdateViewing } from "@/components/viewing/use-viewing-actions";
import { threadQueries } from "@/lib/api/queries";
import { availabilityHours, gapOptions } from "@/lib/seller";
import { formatSlot, slotIso } from "@/lib/viewing";
import type { AppointmentDto, AvailabilityDto } from "@/types/api";
import { useSaveAvailability } from "./use-seller-actions";

/** "เสนอเวลาอื่น": pick one free hour from the listing's viewing slots and send it to the buyer. */
export function ProposeTimeDialog({ request, onClose }: { request: AppointmentDto | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:w-[min(520px,calc(100vw-48px))]">
        {request && <ProposeBody key={request.id} request={request} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ProposeBody({ request, onClose }: { request: AppointmentDto; onClose: () => void }) {
  const slots = useQuery(threadQueries.slots(request.threadId));
  const update = useUpdateViewing();
  const [day, setDay] = useState<string>();
  const [pick, setPick] = useState<SlotPick | null>(null);
  const firstFree = slots.data?.days.find((d) => d.slots.some((s) => s.available))?.date;

  return (
    <>
      <div className="border-b border-line px-5 pt-5 pr-14 pb-4 sm:px-6">
        <DialogTitle className="text-xl font-semibold text-ink">เสนอเวลาอื่นให้ {request.counterpart.name}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-slate">
          เวลาที่ขอ {formatSlot(request.slot, "short")} · ผู้สนใจจะได้รับเวลาใหม่ในแชต และกดรับได้ทันที
        </DialogDescription>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        {slots.isPending ? (
          <div role="status" aria-label="กำลังโหลดเวลาว่าง" className="flex flex-col gap-3">
            <Skeleton className="h-[68px] w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : slots.isError ? (
          <QueryError what="เวลาว่าง" onRetry={() => slots.refetch()} retrying={slots.isFetching} />
        ) : (
          <DateSlotPicker
            days={slots.data.days}
            day={day ?? firstFree ?? slots.data.days[0]?.date ?? ""}
            onDayChange={setDay}
            primary={pick}
            backup={null}
            picking="primary"
            onPick={setPick}
          />
        )}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
        <Button variant="outline" size="base" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button
          size="base"
          disabled={!pick || update.isPending}
          onClick={() =>
            pick &&
            update.mutate(
              { id: request.id, action: "propose", slot: slotIso(pick.date, pick.time) },
              { onSuccess: onClose },
            )
          }
        >
          {pick ? `เสนอ ${formatSlot(slotIso(pick.date, pick.time), "short")}` : "เลือกเวลา"}
        </Button>
      </div>
    </>
  );
}

const hourOptions = availabilityHours.map((h) => ({ value: h, label: h }));

function RangeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: AvailabilityDto["weekdays"];
  onChange: (value: AvailabilityDto["weekdays"]) => void;
}) {
  const [last, setLast] = useState(value ?? { start: "09:00", end: "18:00" });
  const set = (range: NonNullable<AvailabilityDto["weekdays"]>) => {
    setLast(range);
    onChange(range);
  };
  return (
    <fieldset className="flex flex-col gap-2 border-b border-line py-3">
      <legend className="sr-only">{label}</legend>
      <Switch checked={value !== null} onCheckedChange={(on) => onChange(on ? last : null)} label={`รับนัด${label}`} />
      {value && (
        <div className="flex items-center gap-2">
          <FilterSelect
            label={`${label} เริ่ม`}
            value={value.start}
            options={hourOptions}
            onChange={(start) => set({ ...value, start })}
          />
          <span className="text-sm text-slate">ถึง</span>
          <FilterSelect
            label={`${label} สิ้นสุด`}
            value={value.end}
            options={hourOptions}
            onChange={(end) => set({ ...value, end })}
          />
        </div>
      )}
    </fieldset>
  );
}

/** "แก้ไขเวลารับนัด": weekday and weekend hours plus the gap kept between viewings. */
export function AvailabilityDialog({
  open,
  value,
  onClose,
}: {
  open: boolean;
  value: AvailabilityDto;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:w-[min(480px,calc(100vw-48px))]">
        {open && <AvailabilityBody value={value} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function AvailabilityBody({ value, onClose }: { value: AvailabilityDto; onClose: () => void }) {
  const [draft, setDraft] = useState(value);
  const save = useSaveAvailability();
  const invalid = [draft.weekdays, draft.weekend].some((r) => r && r.start >= r.end);

  return (
    <>
      <div className="border-b border-line px-5 pt-5 pr-14 pb-4 sm:px-6">
        <DialogTitle className="text-xl font-semibold text-ink">เวลารับนัด</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-slate">ผู้หาบ้านเลือกเวลานัดได้เฉพาะช่วงนี้</DialogDescription>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-6">
        <RangeRow
          label="วันจันทร์ถึงศุกร์"
          value={draft.weekdays}
          onChange={(weekdays) => setDraft({ ...draft, weekdays })}
        />
        <RangeRow
          label="วันเสาร์อาทิตย์"
          value={draft.weekend}
          onChange={(weekend) => setDraft({ ...draft, weekend })}
        />
        <div className="flex items-center justify-between gap-3 pt-3">
          <span className="text-sm font-medium text-ink">เว้นระหว่างนัด</span>
          <FilterSelect
            label="เว้นระหว่างนัด"
            value={String(draft.gapMinutes)}
            options={gapOptions.map((m) => ({ value: String(m), label: m ? `${m} นาที` : "ไม่เว้น" }))}
            onChange={(m) => setDraft({ ...draft, gapMinutes: Number(m) })}
          />
        </div>
        {invalid && (
          <p role="alert" className="mt-3 text-sm text-danger">
            เวลาเริ่มต้องอยู่ก่อนเวลาสิ้นสุด
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
        <Button variant="outline" size="base" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button
          size="base"
          disabled={invalid || save.isPending}
          onClick={() => save.mutate(draft, { onSuccess: onClose })}
        >
          บันทึก
        </Button>
      </div>
    </>
  );
}

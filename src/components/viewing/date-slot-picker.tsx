"use client";

import { formatDayLabel, slotParts } from "@/lib/viewing";
import { cn } from "@/lib/utils";
import type { ViewingSlotDto } from "@/types/api";

export interface SlotPick {
  date: string;
  time: string;
}

interface DateSlotPickerProps {
  days: { date: string; slots: ViewingSlotDto[] }[];
  day: string;
  onDayChange: (date: string) => void;
  primary: SlotPick | null;
  backup: SlotPick | null;
  /** Which pick the next tap sets. */
  picking: "primary" | "backup";
  onPick: (pick: SlotPick) => void;
}

const same = (a: SlotPick | null, date: string, time: string) => a?.date === date && a.time === time;

/**
 * DateSlotPicker (B18): a day strip and an hour grid. The chosen time is
 * solid, the backup dashed, and booked hours are struck through and disabled.
 */
export function DateSlotPicker({ days, day, onDayChange, primary, backup, picking, onPick }: DateSlotPickerProps) {
  const current = days.find((d) => d.date === day) ?? days[0];

  return (
    <div>
      <div role="group" aria-label="เลือกวัน" className="-mr-4 flex gap-2 overflow-x-auto pr-4 pb-1 sm:mr-0 sm:pr-0">
        {days.map((d) => {
          const free = d.slots.some((s) => s.available);
          const active = d.date === current?.date;
          const [weekday, ...rest] = formatDayLabel(d.date).split(" ");
          return (
            <button
              key={d.date}
              type="button"
              aria-pressed={active}
              disabled={!free}
              onClick={() => onDayChange(d.date)}
              className={cn(
                "flex h-[68px] w-14 shrink-0 flex-col items-center justify-center rounded-lg border text-xs leading-tight transition-colors",
                active ? "border-brand bg-brand text-white" : "border-line-strong text-slate hover:border-ink",
                !free && "border-line bg-mist opacity-55",
              )}
            >
              {weekday}
              <span className={cn("text-lg font-semibold", active ? "text-white" : "text-ink")}>{rest[0]}</span>
              {rest[1]}
              {!free && <span className="sr-only">(เต็ม)</span>}
            </button>
          );
        })}
      </div>

      {current && (
        <div
          role="group"
          aria-label={`เวลาว่าง ${formatDayLabel(current.date)}`}
          className="mt-4 grid grid-cols-4 gap-2"
        >
          {current.slots.map((s) => {
            const isPrimary = same(primary, current.date, s.time);
            const isBackup = same(backup, current.date, s.time);
            const blocked = !s.available || (picking === "backup" && isPrimary) || (picking === "primary" && isBackup);
            return (
              <button
                key={s.time}
                type="button"
                aria-pressed={isPrimary || isBackup}
                disabled={!s.available}
                onClick={() => !blocked && onPick({ date: current.date, time: s.time })}
                className={cn(
                  "h-11 rounded-md border text-sm tabular-nums transition-colors",
                  !s.available
                    ? "border-line bg-mist text-slate/70 line-through"
                    : isPrimary
                      ? "border-2 border-brand bg-brand-soft font-semibold text-violet-700"
                      : isBackup
                        ? "border-[1.5px] border-dashed border-brand font-medium text-violet-700"
                        : "border-line-strong text-ink hover:border-ink",
                )}
              >
                {s.time}
                <span className="sr-only">
                  {!s.available ? " (ไม่ว่าง)" : isPrimary ? " (เวลาที่เลือก)" : isBackup ? " (เวลาสำรอง)" : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-[13px] text-slate">เวลาที่ขีดฆ่ามีคนจองแล้ว</p>
    </div>
  );
}

/** "2026-11-21" + "10:00" picks from an ISO slot (to preselect an earlier request). */
export const pickFromIso = (iso: string): SlotPick => slotParts(iso);

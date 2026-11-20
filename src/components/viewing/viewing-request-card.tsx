"use client";

import { CalendarDays, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DomainStatus } from "@/components/ui/status-pill";
import { formatResponseTime } from "@/lib/listing";
import { viewingStatuses } from "@/lib/status";
import { formatSlot, icsHref, slotParts, viewingIcs } from "@/lib/viewing";
import { cn } from "@/lib/utils";
import type { ThreadDto, ViewingRequestDto } from "@/types/api";

export interface ViewingActions {
  onCancel?: () => void;
  onAccept?: () => void;
  /** Ask for a new time (after a decline, expiry or counter-proposal). */
  onRebook?: () => void;
  busy?: boolean;
}

interface ViewingRequestCardProps extends ViewingActions {
  viewing: ViewingRequestDto;
  role: ThreadDto["role"];
  /** Used for the calendar event title. */
  listingTitle?: string;
  responseMinutes?: number;
  className?: string;
}

/** "Add to calendar" link: downloads a one-event .ics file. */
export function CalendarLink({
  viewing,
  title,
  className,
}: {
  viewing: ViewingRequestDto;
  title: string;
  className?: string;
}) {
  const ics = viewingIcs({
    id: viewing.id,
    slot: viewing.slot,
    title: `ดูทรัพย์: ${title}`,
    description: viewing.note,
  });
  return (
    <a
      href={icsHref(ics)}
      download={`viewing-${slotParts(viewing.slot).date}.ics`}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-brand-strong underline-offset-4 hover:underline",
        className,
      )}
    >
      <CalendarPlus className="size-4" aria-hidden="true" />
      เพิ่มลงปฏิทิน
    </a>
  );
}

/**
 * B14/B16 viewing request in a chat: requested time, backup, party size,
 * status, and the actions the viewer's role allows. Buyer actions are here;
 * the lister's confirm / propose / decline live in the seller dashboard.
 */
export function ViewingRequestCard({
  viewing,
  role,
  listingTitle = "ประกาศ",
  responseMinutes,
  onCancel,
  onAccept,
  onRebook,
  busy,
  className,
}: ViewingRequestCardProps) {
  const mine = role === "buyer";
  const status = viewing.status;
  const closed = status === "declined" || status === "expired" || status === "cancelled";

  return (
    <article
      aria-label={`คำขอนัดดูทรัพย์ ${formatSlot(viewing.slot)}`}
      className={cn(
        "w-full max-w-[400px] rounded-xl border p-3.5",
        closed ? "border-line bg-mist" : "border-violet-200 bg-brand-soft",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-strong">
          <CalendarDays className="size-4" aria-hidden="true" />
          {mine ? "คุณขอนัดดูห้อง" : "ผู้สนใจขอนัดดูห้อง"}
        </p>
        <DomainStatus info={viewingStatuses[status]} />
      </div>
      <p className={cn("mt-1.5 font-semibold text-ink", closed && "text-slate line-through")}>
        {formatSlot(viewing.slot)}
      </p>
      {viewing.backupSlot && (
        <p className="text-[13px] text-slate">เวลาสำรอง: {formatSlot(viewing.backupSlot, "short")}</p>
      )}
      <p className="text-[13px] text-slate">ผู้เข้าชม {viewing.partySize} คน</p>
      {viewing.note && <p className="mt-1 text-[13px] text-ink">“{viewing.note}”</p>}

      {status === "counter_proposed" && viewing.proposedSlot && (
        <div className="mt-2.5 rounded-md bg-white px-3 py-2.5">
          <p className="text-sm text-ink">
            ผู้ลงประกาศเสนอเวลาใหม่: <strong className="font-semibold">{formatSlot(viewing.proposedSlot)}</strong>
          </p>
          {mine && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" onClick={onAccept} disabled={busy}>
                รับเวลาใหม่
              </Button>
              {onRebook && (
                <Button size="sm" variant="outline" onClick={onRebook} disabled={busy}>
                  เลือกเวลาอื่น
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-violet-200/70 pt-2">
        <p className="text-xs text-slate">
          {status === "requested" &&
            `${responseMinutes ? `ผู้ลงประกาศมักตอบ${formatResponseTime(responseMinutes)} · ` : ""}หมดอายุ ${formatSlot(viewing.expiresAt, "short")}`}
          {status === "confirmed" &&
            viewing.respondedAt &&
            `ผู้ลงประกาศยืนยันแล้ว ${slotParts(viewing.respondedAt).time}`}
          {status === "declined" && "ผู้ลงประกาศไม่สะดวกเวลานี้"}
          {status === "expired" && "ผู้ลงประกาศไม่ได้ตอบภายใน 24 ชม."}
          {status === "cancelled" && "ยกเลิกแล้ว"}
          {status === "completed" && "ดูทรัพย์เรียบร้อย"}
          {status === "counter_proposed" && "รอคุณตอบเวลาใหม่"}
        </p>
        {mine && (
          <div className="flex flex-wrap items-center gap-x-3">
            {status === "confirmed" && <CalendarLink viewing={viewing} title={listingTitle} />}
            {(status === "requested" || status === "confirmed") && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="min-h-9 text-sm font-medium text-danger underline-offset-4 hover:underline disabled:opacity-50"
              >
                {status === "requested" ? "ยกเลิกคำขอ" : "ยกเลิกนัด"}
              </button>
            )}
            {closed && onRebook && (
              <button
                type="button"
                onClick={onRebook}
                className="min-h-9 text-sm font-medium text-brand-strong underline-offset-4 hover:underline"
              >
                ขอนัดใหม่
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

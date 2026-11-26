"use client";

import Link from "next/link";
import { Wrench } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { contact, routes } from "@/data/navigation";
import { formatCountdown, formatMaintenanceWindow, maintenancePhase, type MaintenanceWindow } from "@/lib/maintenance";
import { useNow } from "@/lib/use-now";

/** D10 right: planned maintenance, with a countdown and the promise to compensate paid time. */
export function MaintenanceView({ schedule }: { schedule: MaintenanceWindow }) {
  const now = useNow();
  const phase = now === null ? null : maintenancePhase(schedule, now);

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex h-[68px] items-center border-b border-line px-4 sm:px-8">
        <Logo />
      </div>
      <main id="main" className="flex flex-1 items-center bg-mist px-4 py-16">
        <div className="mx-auto w-full max-w-[480px]">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-violet-100 text-brand-strong">
            <Wrench className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-[26px] font-semibold tracking-[-0.015em] text-ink sm:text-[30px]">
            {phase === "over" ? "ปรับปรุงระบบเสร็จแล้ว" : "ปิดปรับปรุงระบบ"}
          </h1>
          <p className="mt-2 text-[16px] leading-relaxed text-slate">
            {formatMaintenanceWindow(schedule)} ระหว่างนี้ค้นหาและดูประกาศไม่ได้
            ประกาศแนะนำและแพ็กเกจจะถูกชดเชยเวลาให้อัตโนมัติ
          </p>

          <div role="timer" aria-live="off" className="mt-6 rounded-lg border border-line bg-white px-4 py-3.5">
            {phase === null ? (
              <p className="text-[13px] text-slate">กำลังตรวจสอบเวลา…</p>
            ) : phase === "over" ? (
              <>
                <p className="font-semibold text-ink">ระบบกลับมาใช้งานได้แล้ว</p>
                <Button asChild className="mt-3">
                  <Link href={routes.home}>กลับหน้าแรก</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-[13px] text-slate">
                  {phase === "active" ? "กลับมาใช้งานได้ในอีกประมาณ" : "เริ่มปิดปรับปรุงในอีก"}
                </p>
                <p className="mt-0.5 text-2xl font-semibold text-ink tabular-nums">
                  {formatCountdown(Date.parse(phase === "active" ? schedule.endsAt : schedule.startsAt) - now!)}
                </p>
              </>
            )}
          </div>

          <p className="mt-4 text-[13px] text-slate">ติดตามสถานะที่ LINE {contact.line}</p>
        </div>
      </main>
    </div>
  );
}

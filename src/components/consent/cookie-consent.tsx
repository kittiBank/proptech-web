"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { routes } from "@/data/navigation";
import {
  acceptAll,
  rejectNonEssential,
  saveConsent,
  setPreferencesOpen,
  useConsent,
  usePreferencesOpen,
  type Consent,
} from "@/lib/cookie-consent";
import { cn } from "@/lib/utils";

const categories = [
  {
    id: "analytics" as const,
    title: "วิเคราะห์การใช้งาน",
    description: "ช่วยเราดูว่าหน้าไหนใช้ยาก โดยไม่ระบุตัวตน",
  },
  {
    id: "marketing" as const,
    title: "การตลาด",
    description: "แสดงโฆษณาโครงการที่ตรงกับความสนใจบนเว็บอื่น",
  },
];

function Preferences({ current }: { current: Consent | null | undefined }) {
  // Non-essential cookies start off unless the visitor already allowed them.
  const [choice, setChoice] = useState({
    analytics: current?.analytics ?? false,
    marketing: current?.marketing ?? false,
  });
  return (
    <>
      <div className="px-6 pt-[22px] pr-14 pb-1.5">
        <DialogTitle className="text-[21px] font-semibold text-ink">ตั้งค่าคุกกี้</DialogTitle>
        <DialogDescription className="mt-0.5 text-sm text-slate">
          เปลี่ยนได้ทุกเมื่อจากลิงก์ “ตั้งค่าคุกกี้” ท้ายเว็บ
        </DialogDescription>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-6">
        <li className="flex items-center gap-4 py-4">
          <span className="flex-1">
            <span className="block font-semibold text-ink">จำเป็น</span>
            <span className="text-[13px] text-slate">การเข้าสู่ระบบ ความปลอดภัย และการจำตัวกรอง</span>
          </span>
          <span className="text-[13px] font-medium text-slate">เปิดเสมอ</span>
        </li>
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-4 border-t border-line py-3">
            <span className="flex-1">
              <span className="block font-semibold text-ink">{c.title}</span>
              <span className="text-[13px] text-slate">{c.description}</span>
            </span>
            <Switch
              label={c.title}
              hideLabel
              checked={choice[c.id]}
              onCheckedChange={(on) => setChoice({ ...choice, [c.id]: on })}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap justify-end gap-2.5 border-t border-line px-6 py-4">
        <Button variant="outline" size="base" onClick={acceptAll}>
          ยอมรับทั้งหมด
        </Button>
        <Button size="base" onClick={() => saveConsent(choice)}>
          บันทึกการตั้งค่า
        </Button>
      </div>
    </>
  );
}

/**
 * Cookie banner and preferences (D7), mounted once in the root layout. The
 * banner shows until the visitor decides; reject and accept carry equal weight.
 */
export function CookieConsent() {
  const consent = useConsent();
  const open = usePreferencesOpen();
  const showBanner = consent === null && !open;

  return (
    <>
      {/* Room at the end of the page, so content can scroll clear of the fixed banner. */}
      {showBanner && <div aria-hidden="true" className="h-[300px] shrink-0 sm:h-[240px]" />}
      {showBanner && (
        <div
          role="region"
          aria-label="การใช้คุกกี้"
          className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 rounded-xl border border-line bg-white px-[22px] py-5 shadow-[0_16px_48px_rgba(26,22,48,.18)] sm:right-auto sm:left-6 sm:w-[440px] lg:bottom-6"
        >
          <p className="font-semibold text-ink">เราใช้คุกกี้</p>
          <p className="mt-1 mb-3.5 text-sm text-slate">
            คุกกี้ที่จำเป็นทำให้เว็บทำงานได้ ส่วนคุกกี้วิเคราะห์และการตลาดจะใช้เมื่อคุณอนุญาตเท่านั้น{" "}
            <Link href={routes.legal("cookies")} className="text-brand-strong underline underline-offset-4">
              นโยบายคุกกี้
            </Link>
          </p>
          {/* Equal weight: same style and size for both choices. */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ink" size="base" onClick={rejectNonEssential}>
              ปฏิเสธที่ไม่จำเป็น
            </Button>
            <Button variant="ink" size="base" onClick={acceptAll}>
              ยอมรับทั้งหมด
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setPreferencesOpen(true)}
            className="mx-auto mt-2 block min-h-9 text-sm font-medium text-brand-strong underline-offset-4 hover:underline"
          >
            ตั้งค่าเอง
          </button>
        </div>
      )}
      <Dialog open={open} onOpenChange={setPreferencesOpen}>
        <DialogContent className="sm:w-[min(520px,calc(100vw-48px))]">
          {open && <Preferences current={consent} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** "ตั้งค่าคุกกี้": reopens the preferences from the footer or the cookie policy. */
export function CookieSettingsButton({
  className,
  children = "ตั้งค่าคุกกี้",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => setPreferencesOpen(true)}
      className={cn("inline-flex min-h-9 items-center text-left", className)}
    >
      {children}
    </button>
  );
}

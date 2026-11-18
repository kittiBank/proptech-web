"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CalendarCheck, Heart, LogIn, Mail, MessageCircle } from "lucide-react";
import { PropertyPhoto } from "@/components/property/property-photo";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { routes } from "@/data/navigation";
import { getPendingAction, safeNext, type GateIntent, type PendingAction } from "@/lib/auth-gate";
import { OrDivider, SsoButtons } from "./auth-fields";
import { LoginForm } from "./login-form";

const copy: Record<GateIntent | "default", { icon: typeof Heart; title: string; body: string; after?: string }> = {
  favorite: {
    icon: Heart,
    title: "เข้าสู่ระบบเพื่อบันทึกประกาศนี้",
    body: "รายการโปรดจะอยู่ในบัญชีของคุณ เปิดดูได้จากทุกอุปกรณ์ และเราจะแจ้งเมื่อราคาลด",
    after: "เข้าสู่ระบบแล้วประกาศนี้จะถูกบันทึกให้ทันที",
  },
  message: {
    icon: MessageCircle,
    title: "เข้าสู่ระบบเพื่อส่งข้อความ",
    body: "ข้อความและคำตอบจากผู้ลงประกาศจะอยู่ในกล่องข้อความของคุณ ไม่ต้องเปิดเผยเบอร์โทรถ้าไม่ต้องการ",
    after: "เข้าสู่ระบบแล้วข้อความของคุณจะถูกส่งให้ทันที",
  },
  viewing: {
    icon: CalendarCheck,
    title: "เข้าสู่ระบบเพื่อนัดชม",
    body: "ติดตามสถานะนัดหมายและรับการยืนยันเวลาจากฝ่ายขายได้ในบัญชีของคุณ",
    after: "เข้าสู่ระบบแล้วคำขอนัดชมจะถูกส่งให้ทันที",
  },
  default: {
    icon: LogIn,
    title: "เข้าสู่ระบบ",
    body: "ดูรายการโปรดและการค้นหาที่บันทึกไว้ได้จากทุกอุปกรณ์",
  },
};

/**
 * B5: login over the current page (intercepted `/login`). Closing or signing
 * in steps back to the page; the gated action then resumes there.
 */
export function LoginModal() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const intent = params.get("intent") as GateIntent | null;
  const text = copy[intent && intent in copy ? intent : "default"];
  const Icon = text.icon;
  const [emailOpen, setEmailOpen] = useState(false);
  // The intercepted route only renders after client navigation, so sessionStorage is there.
  const [pending] = useState<PendingAction | null>(() => (typeof window === "undefined" ? null : getPendingAction()));
  const preview = pending?.intent === intent ? pending?.preview : undefined;

  const close = () => router.back();

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent
        className="overflow-y-auto px-6 pt-8 pb-7 sm:w-[480px] sm:px-8"
        aria-describedby="login-modal-desc"
      >
        <span className="mx-auto inline-flex size-[52px] items-center justify-center rounded-full bg-brand-soft text-brand">
          <Icon className={`size-6 ${intent === "favorite" ? "fill-brand" : ""}`} aria-hidden="true" />
        </span>
        <DialogTitle className="mt-4 mb-1.5 px-8 text-center text-[22px] font-semibold tracking-[-0.01em] text-ink sm:text-2xl">
          {text.title}
        </DialogTitle>
        <DialogDescription id="login-modal-desc" className="text-center text-[15px] text-slate">
          {text.body}
        </DialogDescription>

        {preview && (
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-line p-3">
            {preview.image && (
              <PropertyPhoto image={preview.image} sizes="72px" className="aspect-[4/3] w-[72px] shrink-0 rounded-md" />
            )}
            <span className="min-w-0">
              <span className="line-clamp-1 block text-sm font-semibold text-ink">{preview.title}</span>
              {preview.subtitle && <span className="block text-sm text-slate">{preview.subtitle}</span>}
            </span>
          </div>
        )}

        <div className="mt-5">
          <SsoButtons onSignedIn={close} />
          {emailOpen ? (
            <>
              <OrDivider>หรือใช้อีเมล</OrDivider>
              <LoginForm onSignedIn={close} autoFocus />
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEmailOpen(true)}
              className="mt-2.5 flex h-12 w-full items-center justify-center gap-2.5 rounded-md border border-line-strong bg-white text-[15px] font-medium text-ink hover:border-ink"
            >
              <Mail className="size-[18px]" aria-hidden="true" />
              เข้าสู่ระบบด้วยอีเมล
            </button>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-slate">
          ยังไม่มีบัญชี{" "}
          <Link
            href={routes.register(next)}
            className="font-medium text-brand-strong underline-offset-4 hover:underline"
          >
            สมัครสมาชิกฟรี
          </Link>
        </p>
        {text.after && <p className="mt-2.5 text-center text-[13px] text-slate">{text.after}</p>}
      </DialogContent>
    </Dialog>
  );
}

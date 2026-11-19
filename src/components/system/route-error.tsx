"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RouteErrorProps {
  /** Whatever was thrown; server errors arrive as `Error` with a `digest`. */
  error: unknown;
  retry: () => void;
  /** Extra reassurance for the section, e.g. that a draft is saved. */
  note?: string;
  /** Pages outside the site shell need their own logo bar. */
  withLogo?: boolean;
  className?: string;
}

/** Server log id for this error, shown so the visitor can quote it to support. */
function referenceOf(error: unknown): string | undefined {
  if (error instanceof Error && "digest" in error && typeof error.digest === "string") return error.digest;
}

/** D10 (500): what happened, retry, a way home, and a reference code. */
export function RouteError({ error, retry, note, withLogo, className }: RouteErrorProps) {
  const reference = referenceOf(error);

  useEffect(() => {
    // Stand-in for an error reporting service.
    console.error(error);
  }, [error]);

  return (
    <div className={cn("flex min-h-[70vh] flex-col", className)}>
      {withLogo && (
        <div className="flex h-[68px] items-center border-b border-line px-4 sm:px-8">
          <Logo />
        </div>
      )}
      <div role="alert" className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center px-4 py-16">
        <p className="text-[13px] font-semibold text-slate">ข้อผิดพลาด 500</p>
        <h1 className="mt-1.5 text-[26px] font-semibold tracking-[-0.015em] text-ink sm:text-[30px]">
          ระบบขัดข้องชั่วคราว
        </h1>
        <p className="mt-2 max-w-[440px] text-[16px] leading-relaxed text-slate">
          ไม่ใช่ความผิดของคุณ ทีมงานได้รับแจ้งแล้ว ลองโหลดหน้านี้ใหม่อีกครั้งในอีกสักครู่{note ? ` ${note}` : ""}
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button onClick={() => retry()}>
            <RotateCw aria-hidden="true" />
            ลองอีกครั้ง
          </Button>
          <Button asChild variant="outline">
            <Link href="/">กลับหน้าแรก</Link>
          </Button>
        </div>
        {reference && (
          <p className="mt-6 text-[13px] text-slate">
            รหัสอ้างอิง <span className="font-mono text-ink">{reference}</span> แจ้งรหัสนี้กับ{" "}
            <Link href="/help" className="text-brand-strong underline-offset-4 hover:underline">
              ทีมงาน
            </Link>
            ได้
          </p>
        )}
      </div>
    </div>
  );
}

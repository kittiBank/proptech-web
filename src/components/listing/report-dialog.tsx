"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { RadioCard } from "@/components/ui/choice";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { inputClass } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import { REPORT_DETAILS_MAX, type ReportReason } from "@/types/api";

export const reportReasons: { value: ReportReason; title: string; description?: string }[] = [
  { value: "scam", title: "ประกาศหลอกลวงหรือมิจฉาชีพ", description: "เช่น ขอให้โอนเงินก่อนดูห้อง" },
  { value: "inaccurate", title: "ข้อมูลไม่ตรงกับความจริง", description: "ราคา รูป หรือขนาดห้องไม่ตรง" },
  { value: "unavailable", title: "ขายหรือปล่อยเช่าไปแล้ว" },
  { value: "duplicate", title: "ประกาศซ้ำ", description: "ห้องเดียวกันลงหลายประกาศ" },
  { value: "other", title: "อื่นๆ" },
];

function ReportForm({ slug, code, onClose }: { slug: string; code: string; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason>();
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string>();
  const send = useMutation({
    mutationFn: () => api.reportListing(slug, { reason: reason!, details: details.trim() || undefined }),
    onSuccess: () => {
      toast("ได้รับรายงานแล้ว ทีมงานจะตรวจภายใน 24 ชม.");
      onClose();
    },
    onError: () => setError("ส่งรายงานไม่สำเร็จ ลองอีกครั้ง"),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!reason) return setError("เลือกเหตุผลที่แจ้ง");
    if (reason === "other" && !details.trim()) return setError("เล่าเพิ่มเติมว่าพบปัญหาอะไร");
    setError(undefined);
    send.mutate();
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="px-6 pt-[22px] pr-14">
        <DialogTitle className="text-[21px] font-semibold text-ink">แจ้งประกาศนี้</DialogTitle>
        <DialogDescription className="mt-0.5 text-sm text-slate">
          {code} · ผู้ลงประกาศจะไม่รู้ว่าใครเป็นคนแจ้ง
        </DialogDescription>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-6 py-[18px]">
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">เหตุผลที่แจ้ง</legend>
          {reportReasons.map((r) => (
            <RadioCard
              key={r.value}
              name="report-reason"
              checked={reason === r.value}
              onChange={() => {
                setReason(r.value);
                setError(undefined);
              }}
              title={r.title}
              description={r.description}
              className="py-3"
            />
          ))}
        </fieldset>
        <label htmlFor="report-details" className="mt-2 text-sm font-medium text-ink">
          เล่าเพิ่มเติม{" "}
          <span className="font-normal text-slate">
            {reason === "other" ? "(จำเป็น)" : "(ช่วยให้เราตรวจได้เร็วขึ้น)"}
          </span>
        </label>
        <textarea
          id="report-details"
          rows={3}
          maxLength={REPORT_DETAILS_MAX}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          aria-describedby="report-details-count"
          className={cn(inputClass, "min-h-[84px] py-2.5")}
        />
        <p id="report-details-count" className="text-right text-xs text-slate tabular-nums">
          {details.length}/{REPORT_DETAILS_MAX}
        </p>
        <Callout tone="warning">
          ถ้าโอนเงินไปแล้ว แจ้งความที่{" "}
          <a
            href="https://thaipoliceonline.go.th"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-4"
          >
            thaipoliceonline.go.th
          </a>{" "}
          และติดต่อธนาคารเพื่ออายัดบัญชีทันที
        </Callout>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2.5 border-t border-line px-6 py-4">
        <Button type="button" variant="ghost" size="base" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button type="submit" size="base" disabled={send.isPending}>
          {send.isPending ? "กำลังส่ง…" : "ส่งรายงาน"}
        </Button>
      </div>
    </form>
  );
}

/**
 * "แจ้งประกาศ" (D6): a quiet link under the poster card that opens the report
 * dialog on `?report=1`, so the dialog can be linked to directly.
 */
export function ReportListing({ slug, code }: { slug: string; code: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const open = params.get("report") === "1";

  const setOpen = (next: boolean) => {
    const sp = new URLSearchParams(params.toString());
    if (next) sp.set("report", "1");
    else sp.delete("report");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-sm text-slate underline-offset-4 hover:text-ink hover:underline"
      >
        <Flag className="size-4" aria-hidden="true" />
        แจ้งประกาศ
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:w-[min(560px,calc(100vw-48px))]">
          {open && <ReportForm slug={slug} code={code} onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

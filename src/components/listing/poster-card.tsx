"use client";

import { useMutation } from "@tanstack/react-query";
import { BadgeCheck, CircleCheck, Flag, MessageCircle, Phone, ShieldAlert, Smartphone } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import { formatResponseTime, toBuddhistYear } from "@/lib/listing";
import { cn } from "@/lib/utils";
import type { Poster, PropertyDetail } from "@/types/property";

const avatarColours = ["bg-brand", "bg-ink", "bg-violet-700", "bg-mrt-blue", "bg-bts-silom"];

function initials(name: string) {
  const words = name.replace(/^(บริษัท|คุณ)\s*/, "").split(/\s+/);
  return words[0]?.charAt(0) ?? "?";
}

/** 02-000-1101 → 02-000-11xx until the visitor asks for the number. */
const maskPhone = (phone: string) => phone.replace(/\d{2}$/, "xx");

const lineHref = (lineId: string) => `https://line.me/R/ti/p/~${encodeURIComponent(lineId)}`;

function PosterHeader({ poster }: { poster: Poster }) {
  const colour = avatarColours[poster.name.length % avatarColours.length];
  return (
    <div className="flex items-start gap-4">
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-14 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-white",
          colour,
        )}
      >
        {initials(poster.name)}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] text-slate">{poster.kind === "agent" ? "นายหน้า" : "เจ้าของทรัพย์ลงประกาศเอง"}</p>
        <p className="text-lg leading-snug font-semibold text-ink">{poster.name}</p>
        {poster.company && <p className="text-sm text-slate">{poster.company}</p>}
      </div>
    </div>
  );
}

function EnquiryForm({ property, onDone }: { property: PropertyDetail; onDone?: () => void }) {
  const id = useId();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: (body: { name: string; phone: string; message: string }) => api.createEnquiry(property.slug, body),
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      name: String(form.get("name") ?? "").trim(),
      phone: String(form.get("phone") ?? "").replace(/\D/g, ""),
      message: String(form.get("message") ?? "").trim(),
    };
    const next: Record<string, string> = {};
    if (!body.name) next.name = "กรอกชื่อของคุณ";
    if (!/^0\d{8,9}$/.test(body.phone)) next.phone = "กรอกเบอร์โทร 9–10 หลัก เช่น 0812345678";
    if (!body.message) next.message = "เขียนข้อความถึงผู้ลงประกาศ";
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate(body, { onSuccess: () => onDone?.() });
  };

  if (mutation.isSuccess) {
    return (
      <div role="status" className="flex gap-3 rounded-md bg-brand-soft p-4 text-[15px] text-ink">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden="true" />
        <p>
          ส่งข้อความแล้ว {property.poster.name} มักตอบ{formatResponseTime(property.poster.responseMinutes)}
          ทางเบอร์ที่คุณให้ไว้
        </p>
      </div>
    );
  }

  const field =
    "w-full rounded-md border border-line-strong bg-white px-3 text-[15px] text-ink outline-none placeholder:text-slate/70 focus:border-brand focus:ring-2 focus:ring-violet-100 aria-[invalid=true]:border-rose-600";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3" aria-label="ส่งข้อความถึงผู้ลงประกาศ">
      {[
        { name: "name", label: "ชื่อ", type: "text", autoComplete: "name" },
        { name: "phone", label: "เบอร์โทร", type: "tel", autoComplete: "tel" },
      ].map((f) => (
        <div key={f.name}>
          <label htmlFor={`${id}-${f.name}`} className="text-[13px] font-medium text-slate">
            {f.label}
          </label>
          <input
            id={`${id}-${f.name}`}
            name={f.name}
            type={f.type}
            autoComplete={f.autoComplete}
            inputMode={f.type === "tel" ? "tel" : undefined}
            aria-invalid={Boolean(errors[f.name])}
            aria-describedby={errors[f.name] ? `${id}-${f.name}-error` : undefined}
            className={cn(field, "mt-1 h-11")}
          />
          {errors[f.name] && (
            <p id={`${id}-${f.name}-error`} className="mt-1 text-[13px] text-rose-700">
              {errors[f.name]}
            </p>
          )}
        </div>
      ))}
      <div>
        <label htmlFor={`${id}-message`} className="text-[13px] font-medium text-slate">
          ข้อความ
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          rows={3}
          defaultValue={`สนใจประกาศ ${property.code} "${property.title}" ขอรายละเอียดเพิ่มเติมและนัดดู${property.type === "land" ? "ที่ดิน" : "ห้อง"}ค่ะ/ครับ`}
          aria-invalid={Boolean(errors.message)}
          className={cn(field, "mt-1 resize-y py-2.5 leading-relaxed")}
        />
        {errors.message && <p className="mt-1 text-[13px] text-rose-700">{errors.message}</p>}
      </div>
      {mutation.isError && (
        <p role="alert" className="text-[13px] text-rose-700">
          {mutation.error instanceof ApiError && mutation.error.status === 400
            ? "ข้อมูลไม่ครบ ตรวจชื่อ เบอร์โทร และข้อความอีกครั้ง"
            : "ส่งข้อความไม่สำเร็จ ลองอีกครั้ง"}
        </p>
      )}
      <Button type="submit" variant="ink" disabled={mutation.isPending}>
        {mutation.isPending ? "กำลังส่ง..." : "ส่งข้อความ"}
      </Button>
    </form>
  );
}

/** Right-hand column: who posted the listing and every way to reach them. */
export function PosterCard({ property }: { property: PropertyDetail }) {
  const { poster } = property;
  const [showPhone, setShowPhone] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <section
        id="contact"
        aria-label="ติดต่อผู้ลงประกาศ"
        className="scroll-mt-[150px] rounded-lg border border-line bg-white p-5 sm:p-6"
      >
        <PosterHeader poster={poster} />

        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink">
          {poster.phoneVerified && (
            <li className="inline-flex items-center gap-1.5">
              <Smartphone className="size-4 text-brand" aria-hidden="true" />
              ยืนยันเบอร์โทรแล้ว
            </li>
          )}
          {poster.idVerified && (
            <li className="inline-flex items-center gap-1.5">
              <BadgeCheck className="size-4 text-brand" aria-hidden="true" />
              ยืนยันตัวตนแล้ว
            </li>
          )}
        </ul>

        <dl className="mt-5 grid grid-cols-3 divide-x divide-line rounded-md bg-mist py-3 text-center">
          <div className="px-2">
            <dt className="text-xs text-slate">ประกาศ</dt>
            <dd className="mt-0.5 text-base font-semibold text-ink tabular-nums">
              {formatNumber(poster.activeListings)}
            </dd>
          </div>
          <div className="px-2">
            <dt className="text-xs text-slate">ตอบกลับ</dt>
            <dd className="mt-0.5 text-base font-semibold text-ink">
              {poster.responseMinutes < 60
                ? `${poster.responseMinutes} นาที`
                : `${Math.round(poster.responseMinutes / 60)} ชม.`}
            </dd>
          </div>
          <div className="px-2">
            <dt className="text-xs text-slate">สมาชิกตั้งแต่</dt>
            <dd className="mt-0.5 text-base font-semibold text-ink tabular-nums">
              {toBuddhistYear(poster.memberSince)}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-col gap-2.5">
          {showPhone ? (
            <Button asChild size="lg">
              <a href={`tel:${poster.phone.replace(/\D/g, "")}`}>
                <Phone aria-hidden="true" />
                โทร {poster.phone}
              </a>
            </Button>
          ) : (
            <Button size="lg" onClick={() => setShowPhone(true)}>
              <Phone aria-hidden="true" />
              แสดงเบอร์โทร {maskPhone(poster.phone)}
            </Button>
          )}
          {poster.lineId && (
            <Button asChild size="lg" variant="outline">
              <a href={lineHref(poster.lineId)} target="_blank" rel="noopener noreferrer">
                <span
                  aria-hidden="true"
                  className="inline-flex size-5 items-center justify-center rounded-full bg-[#06C755] text-[11px] font-bold text-white"
                >
                  L
                </span>
                แชทผ่าน LINE
              </a>
            </Button>
          )}
          <Button
            size="lg"
            variant="outline"
            aria-expanded={formOpen}
            aria-controls="enquiry-form"
            onClick={() => setFormOpen((v) => !v)}
          >
            <MessageCircle aria-hidden="true" />
            ส่งข้อความถึงผู้ลงประกาศ
          </Button>
        </div>

        {formOpen && (
          <div id="enquiry-form" className="mt-5 border-t border-line pt-5">
            <EnquiryForm property={property} />
          </div>
        )}

        <p className="mt-4 text-[13px] text-slate">
          มักตอบกลับ{formatResponseTime(poster.responseMinutes)} ภาษาที่ใช้: {poster.languages.join(", ")}
        </p>
      </section>

      <aside className="flex gap-3 rounded-lg border border-line bg-white p-4 text-[13px] leading-relaxed text-slate">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
        <p>นัดดูทรัพย์จริงและตรวจโฉนดหรือสัญญาก่อนโอนเงินทุกครั้ง PropertyHub ไม่เรียกเก็บเงินมัดจำแทนผู้ลงประกาศ</p>
      </aside>

      <a
        href={`/help/report?listing=${encodeURIComponent(property.code)}`}
        className="inline-flex items-center gap-2 self-start text-[13px] text-slate underline-offset-4 hover:text-ink hover:underline"
      >
        <Flag className="size-3.5" aria-hidden="true" />
        รายงานประกาศนี้
      </a>
    </div>
  );
}

/** Phone-width contact bar pinned to the bottom of the screen. */
export function MobileContactBar({ property }: { property: PropertyDetail }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <Button asChild className="flex-1" size="lg">
        <a href={`tel:${property.poster.phone.replace(/\D/g, "")}`}>
          <Phone aria-hidden="true" />
          โทร
        </a>
      </Button>
      {property.poster.lineId && (
        <Button asChild variant="outline" size="lg" className="flex-1">
          <a href={lineHref(property.poster.lineId)} target="_blank" rel="noopener noreferrer">
            LINE
          </a>
        </Button>
      )}
      <Button asChild variant="outline" size="lg" className="flex-1">
        <a href="#contact">
          <MessageCircle aria-hidden="true" />
          ข้อความ
        </a>
      </Button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Clock, ShieldX, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { TextField } from "@/components/ui/field";
import { QrCode } from "@/components/ui/qr-code";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { DomainStatus } from "@/components/ui/status-pill";
import { Stepper, type StepItem } from "@/components/ui/stepper";
import { contact, routes } from "@/data/navigation";
import { profileQuery, kycQuery } from "@/lib/api/queries";
import { companySchema, isKycStep, kycEditable, kycSteps, maskThaiId, personalSchema, resumeStep } from "@/lib/kyc";
import { formatDayMonth, formatThaiDate } from "@/lib/seller";
import { kycStatuses } from "@/lib/status";
import { useZodForm } from "@/lib/use-zod-form";
import { useSession } from "@/providers/session";
import type { KycDocSlot, KycDto, KycStep } from "@/types/api";
import { DocUpload } from "./doc-upload";
import { useRestartKyc, useSubmitKyc, useUpdateKyc } from "./use-kyc-actions";

const card = "rounded-[10px] border border-line bg-white p-5 sm:p-[22px]";
const stepIndex = (s: KycStep) => kycSteps.findIndex((x) => x.id === s);

function StepHeader({ step, title, sub }: { step: KycStep; title: string; sub: ReactNode }) {
  return (
    <>
      <p className="text-[13px] text-slate">
        ขั้นที่ {stepIndex(step) + 1} จาก {kycSteps.length}
      </p>
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-0.5 text-sm text-slate">{sub}</p>
    </>
  );
}

function Nav({
  back,
  next,
  nextLabel = "ถัดไป",
  disabled,
  type = "button",
}: {
  back?: () => void;
  next?: () => void;
  nextLabel?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <div className="flex justify-between gap-3">
      {back ? (
        <Button type="button" variant="outline" size="md" onClick={back}>
          ย้อนกลับ
        </Button>
      ) : (
        <span />
      )}
      <Button type={type} size="md" className="px-[22px]" onClick={next} disabled={disabled}>
        {nextLabel}
      </Button>
    </div>
  );
}

/** "ถ่ายจากมือถือ": the phone hand-off QR (placeholder until the real upload link exists). */
function PhoneHandoff() {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center gap-2.5 rounded-[10px] border border-line p-4 text-center">
      <QrCode payload="kyc-phone-handoff" label="QR สำหรับถ่ายรูปจากมือถือ (ตัวอย่าง)" className="size-[110px]" />
      <p className="flex items-center gap-1.5 text-[13px] text-slate">
        <Smartphone className="size-4" aria-hidden="true" />
        สแกนเพื่อถ่ายจากมือถือ รูปจะขึ้นที่นี่เอง
      </p>
    </div>
  );
}

function PrivacyNote() {
  return (
    <ul className="mt-4 list-disc pl-5 text-sm leading-7 text-slate">
      <li>ไฟล์ใช้เพื่อยืนยันตัวตนเท่านั้น ไม่แสดงบนประกาศ</li>
      <li>
        เก็บตาม
        <Link href="/legal/privacy" className="text-brand-strong underline underline-offset-4">
          นโยบายความเป็นส่วนตัว
        </Link>{" "}
        และลบเมื่อปิดบัญชี
      </li>
    </ul>
  );
}

function PersonalStep({ kyc, onDone }: { kyc: KycDto; onDone: () => void }) {
  const { user } = useSession();
  const { data: profile } = useQuery(profileQuery);
  const save = useUpdateKyc();
  const { errors, formProps } = useZodForm(personalSchema, (personal) =>
    save.mutate({ personal }, { onSuccess: onDone }),
  );
  const p = kyc.personal;
  return (
    <form {...formProps} className="flex flex-col gap-4">
      <section className={card}>
        <StepHeader step="personal" title="ข้อมูลส่วนตัว" sub="กรอกให้ตรงกับบัตรประชาชน ใช้ตรวจกับเอกสารเท่านั้น" />
        <div className="mt-[18px] grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            id="kyc-first"
            name="firstName"
            label="ชื่อ"
            autoComplete="given-name"
            defaultValue={p?.firstName ?? user?.firstName}
            error={errors.firstName}
          />
          <TextField
            id="kyc-last"
            name="lastName"
            label="นามสกุล"
            autoComplete="family-name"
            defaultValue={p?.lastName ?? user?.lastName}
            error={errors.lastName}
          />
          <TextField
            id="kyc-id"
            name="idNumber"
            label="เลขบัตรประชาชน"
            inputMode="numeric"
            maxLength={17}
            hint="13 หลัก"
            defaultValue={p?.idNumber}
            error={errors.idNumber}
          />
          <TextField
            id="kyc-birth"
            name="birthDate"
            label="วันเกิด"
            type="date"
            defaultValue={p?.birthDate}
            error={errors.birthDate}
          />
          <TextField
            id="kyc-phone"
            name="phone"
            label="เบอร์โทร"
            type="tel"
            autoComplete="tel"
            defaultValue={p?.phone ?? profile?.phone}
            error={errors.phone}
          />
        </div>
      </section>
      <Nav type="submit" nextLabel={save.isPending ? "กำลังบันทึก…" : "บันทึกและไปต่อ"} disabled={save.isPending} />
    </form>
  );
}

function DocsStep({
  kyc,
  step,
  slots,
  title,
  sub,
  onBack,
  onNext,
}: {
  kyc: KycDto;
  step: KycStep;
  slots: KycDocSlot[];
  title: string;
  sub: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const doc = (slot: KycDocSlot) => kyc.documents.find((d) => d.slot === slot);
  const attention = kyc.status === "needs_info" && kyc.fixSteps?.includes(step);
  const ready = kyc.completedSteps.includes(step) && !attention;
  return (
    <>
      <section className={card}>
        <StepHeader step={step} title={title} sub={sub} />
        <div className="mt-[18px] grid grid-cols-1 gap-4 sm:grid-cols-2">
          {slots.map((slot) => (
            <DocUpload key={slot} slot={slot} doc={doc(slot)} attention={attention} />
          ))}
          {slots.length === 1 && <PhoneHandoff />}
        </div>
        <PrivacyNote />
      </section>
      <Nav back={onBack} next={onNext} disabled={!ready} />
    </>
  );
}

function CompanyStep({ kyc, onBack, onNext }: { kyc: KycDto; onBack: () => void; onNext: () => void }) {
  const save = useUpdateKyc();
  const [affiliated, setAffiliated] = useState(Boolean(kyc.company));
  const { errors, formProps } = useZodForm(companySchema, (company) => save.mutate({ company }, { onSuccess: onNext }));
  const hasDoc = kyc.documents.some((d) => d.slot === "company");

  if (!affiliated) {
    return (
      <>
        <section className={card}>
          <StepHeader
            step="company"
            title="สังกัดบริษัท (ไม่บังคับ)"
            sub="ถ้าทำงานกับบริษัทนายหน้า ใส่ไว้เพื่อแสดงชื่อบริษัทบนโปรไฟล์"
          />
          <div className="mt-[18px] flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setAffiliated(true)}>
              ฉันสังกัดบริษัท
            </Button>
            <Button
              variant="ghost"
              disabled={save.isPending}
              onClick={() => save.mutate({ company: null, companySkipped: true }, { onSuccess: onNext })}
            >
              ข้ามขั้นนี้ ฉันเป็นนายหน้าอิสระ
            </Button>
          </div>
        </section>
        <Nav back={onBack} next={onNext} disabled={!kyc.completedSteps.includes("company")} />
      </>
    );
  }

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <section className={card}>
        <StepHeader step="company" title="สังกัดบริษัท" sub="หนังสือรับรองบริษัท หรือนามบัตรที่มีชื่อคุณ" />
        <div className="mt-[18px] grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            id="kyc-company"
            name="name"
            label="ชื่อบริษัท"
            defaultValue={kyc.company?.name}
            error={errors.name}
          />
          <TextField
            id="kyc-company-no"
            name="registrationNo"
            label="เลขทะเบียนบริษัท (ไม่บังคับ)"
            defaultValue={kyc.company?.registrationNo}
          />
          <DocUpload slot="company" doc={kyc.documents.find((d) => d.slot === "company")} className="sm:col-span-2" />
        </div>
        <button
          type="button"
          onClick={() => save.mutate({ company: null, companySkipped: true }, { onSuccess: onNext })}
          className="mt-3 text-sm font-medium text-slate underline-offset-4 hover:text-ink hover:underline"
        >
          ไม่สังกัดบริษัท ข้ามขั้นนี้
        </button>
      </section>
      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          ย้อนกลับ
        </Button>
        <Button type="submit" disabled={save.isPending || !hasDoc}>
          บันทึกและไปต่อ
        </Button>
      </div>
    </form>
  );
}

function ReviewStep({ kyc, go, onBack }: { kyc: KycDto; go: (s: KycStep) => void; onBack: () => void }) {
  const submit = useSubmitKyc();
  const [agreed, setAgreed] = useState(false);
  const missing = kycSteps.filter((s) => s.id !== "review" && !kyc.completedSteps.includes(s.id));
  const fixes = kyc.fixSteps ?? [];
  const p = kyc.personal;
  const rows: { step: KycStep; label: string; value: string }[] = [
    {
      step: "personal",
      label: "ข้อมูลส่วนตัว",
      value: p ? `${p.firstName} ${p.lastName} · ${maskThaiId(p.idNumber)} · ${p.phone}` : "ยังไม่กรอก",
    },
    {
      step: "id_card",
      label: "บัตรประชาชน",
      value: kyc.completedSteps.includes("id_card") ? "ด้านหน้าและด้านหลัง" : "ยังไม่ครบ",
    },
    {
      step: "selfie",
      label: "เซลฟีคู่บัตร",
      value: kyc.completedSteps.includes("selfie") ? "อัปโหลดแล้ว" : "ยังไม่มี",
    },
    {
      step: "company",
      label: "สังกัดบริษัท",
      value: kyc.companySkipped ? "นายหน้าอิสระ" : (kyc.company?.name ?? "ยังไม่เลือก"),
    },
  ];
  const locked = !kycEditable(kyc.status);

  return (
    <>
      <section className={card}>
        <StepHeader
          step="review"
          title="ตรวจข้อมูลและส่ง"
          sub="ทีมงานตรวจภายใน 1 วันทำการ แจ้งผลทางอีเมลและการแจ้งเตือน"
        />
        <dl className="mt-[18px] divide-y divide-line rounded-lg border border-line">
          {rows.map((r) => (
            <div key={r.step} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
              <dt className="w-32 shrink-0 text-sm text-slate">{r.label}</dt>
              <dd className="min-w-0 flex-1 text-sm text-ink">
                {r.value}
                {fixes.includes(r.step) && <span className="ml-2 font-medium text-warning">ต้องแก้ไข</span>}
              </dd>
              {!locked && (
                <button
                  type="button"
                  onClick={() => go(r.step)}
                  className="text-sm font-medium text-brand-strong underline-offset-4 hover:underline"
                >
                  แก้ไข<span className="sr-only">{r.label}</span>
                </button>
              )}
            </div>
          ))}
        </dl>
        {!locked && (
          <label className="mt-4 flex items-start gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-brand"
            />
            ข้าพเจ้ายืนยันว่าข้อมูลและเอกสารเป็นของข้าพเจ้าและเป็นความจริง
            และยินยอมให้ใช้เพื่อยืนยันตัวตนตามนโยบายความเป็นส่วนตัว
          </label>
        )}
        {missing.length > 0 && (
          <p role="alert" className="mt-3 text-sm text-danger">
            ยังขาด: {missing.map((s) => s.label).join(", ")}
          </p>
        )}
      </section>
      {!locked && (
        <Nav
          back={onBack}
          next={() => submit.mutate()}
          nextLabel={submit.isPending ? "กำลังส่ง…" : kyc.status === "needs_info" ? "ส่งอีกครั้ง" : "ส่งตรวจสอบ"}
          disabled={!agreed || missing.length > 0 || fixes.length > 0 || submit.isPending}
        />
      )}
    </>
  );
}

function StatusPanel({ kyc }: { kyc: KycDto }) {
  const restart = useRestartKyc();
  if (kyc.status === "submitted") {
    return (
      <Callout tone="info" icon={Clock} title="ส่งเอกสารแล้ว รอตรวจสอบ">
        ส่งเมื่อ {kyc.submittedAt && formatThaiDate(kyc.submittedAt)} ทีมงานตรวจภายใน 1 วันทำการ
        ระหว่างนี้แก้ไขเอกสารไม่ได้ เราจะแจ้งผลทางอีเมลและการแจ้งเตือน
      </Callout>
    );
  }
  if (kyc.status === "needs_info") {
    return (
      <Callout tone="warning" title="ทีมงานขอข้อมูลเพิ่ม" role="alert">
        {kyc.reviewNote} แก้ไขขั้นที่มีเครื่องหมาย แล้วส่งอีกครั้ง
      </Callout>
    );
  }
  if (kyc.status === "approved") {
    return (
      <section aria-labelledby="kyc-approved" className={`${card} flex flex-col items-center py-10 text-center`}>
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
          <BadgeCheck className="size-8" aria-hidden="true" />
        </span>
        <h2 id="kyc-approved" className="mt-4 text-xl font-semibold text-ink">
          ยืนยันตัวตนแล้ว
        </h2>
        <p className="mt-1.5 max-w-[46ch] text-[15px] text-slate">
          ประกาศและโปรไฟล์ของคุณมีป้าย “ยืนยันตัวตนแล้ว” ลงประกาศในนามนายหน้าได้ทันที
          {kyc.reviewedAt && ` (อนุมัติ ${formatDayMonth(kyc.reviewedAt)})`}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href={routes.postProperty}>ลงประกาศใหม่</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={routes.pricing}>ดูแพ็กเกจนายหน้า</Link>
          </Button>
        </div>
      </section>
    );
  }
  if (kyc.status === "rejected") {
    return (
      <section aria-labelledby="kyc-rejected" className={`${card} flex flex-col items-center py-10 text-center`}>
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-danger-soft text-danger">
          <ShieldX className="size-8" aria-hidden="true" />
        </span>
        <h2 id="kyc-rejected" className="mt-4 text-xl font-semibold text-ink">
          ยืนยันตัวตนไม่ผ่าน
        </h2>
        <p className="mt-1.5 max-w-[46ch] text-[15px] text-slate">{kyc.reviewNote}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button disabled={restart.isPending} onClick={() => restart.mutate()}>
            เริ่มใหม่
          </Button>
          <Button asChild variant="outline">
            <a href={`mailto:${contact.email}?subject=${encodeURIComponent("ยืนยันตัวตนนายหน้า")}`}>ติดต่อทีมงาน</a>
          </Button>
        </div>
      </section>
    );
  }
  return null;
}

/** `/dashboard/verify` (C16): five steps to verify an agent, then the review result. */
export function VerifyView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data: kyc, isPending, isError, refetch, isFetching } = useQuery(kycQuery);

  if (isPending) {
    return (
      <div role="status" aria-label="กำลังโหลดการยืนยันตัวตน" className="flex flex-col gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-80 w-full rounded-[10px]" />
      </div>
    );
  }
  if (isError) return <QueryError what="การยืนยันตัวตน" onRetry={() => refetch()} retrying={isFetching} />;

  const editable = kycEditable(kyc.status);
  const resume = resumeStep(kyc);
  // A step can be opened when it is done or is the next one to do; otherwise land on where to resume.
  const asked = params.get("step");
  const reachable = (s: KycStep) => s === resume || kyc.completedSteps.includes(s) || stepIndex(s) < stepIndex(resume);
  const step: KycStep = !editable ? "review" : isKycStep(asked) && reachable(asked) ? asked : resume;
  const go = (s: KycStep) => router.replace(`${pathname}?step=${s}`, { scroll: false });
  const move = (delta: number) => go(kycSteps[Math.max(0, Math.min(kycSteps.length - 1, stepIndex(step) + delta))].id);

  const fixes = kyc.status === "needs_info" ? (kyc.fixSteps ?? []) : [];
  const items: StepItem[] = kycSteps.map((s) => {
    const done = kyc.completedSteps.includes(s.id) && !fixes.includes(s.id) && s.id !== "review";
    const current = s.id === step && (editable || s.id === "review");
    return {
      id: s.id,
      label: s.label,
      description: fixes.includes(s.id)
        ? "ต้องแก้ไข"
        : s.id === "review" && kyc.status === "submitted"
          ? "กำลังตรวจสอบ"
          : s.description,
      attention: fixes.includes(s.id),
      state: current ? "current" : done || (!editable && s.id !== "review") ? "done" : "upcoming",
      href: editable && reachable(s.id) ? `${pathname}?step=${s.id}` : undefined,
    };
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.015em] text-ink sm:text-[28px]">ยืนยันตัวตนนายหน้า</h1>
          <p className="mt-1 text-slate">ต้องยืนยันก่อนเผยแพร่ประกาศในนามนายหน้า ใช้เวลาประมาณ 5 นาที</p>
        </div>
        <DomainStatus info={kycStatuses[kyc.status]} />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <section aria-label="ขั้นตอน" className={`${card} py-3`}>
          <Stepper orientation="vertical" label="ขั้นตอนยืนยันตัวตน" steps={items} />
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          <StatusPanel kyc={kyc} />
          {kyc.status === "approved" || kyc.status === "rejected" ? null : step === "personal" ? (
            <PersonalStep kyc={kyc} onDone={() => go("id_card")} />
          ) : step === "id_card" ? (
            <DocsStep
              kyc={kyc}
              step="id_card"
              slots={["id_front", "id_back"]}
              title="บัตรประชาชน"
              sub="ถ่ายให้เห็นทั้งใบ ตัวอักษรชัด ไม่มีแสงสะท้อน ปิดเลขหลังบัตร (Laser ID) ได้"
              onBack={() => move(-1)}
              onNext={() => move(1)}
            />
          ) : step === "selfie" ? (
            <DocsStep
              kyc={kyc}
              step="selfie"
              slots={["selfie"]}
              title="เซลฟีคู่กับบัตรประชาชน"
              sub="ถือบัตรไว้ใต้คาง เห็นหน้าและบัตรชัดเจน ปิดเลขหลังบัตรได้"
              onBack={() => move(-1)}
              onNext={() => move(1)}
            />
          ) : step === "company" ? (
            <CompanyStep kyc={kyc} onBack={() => move(-1)} onNext={() => go("review")} />
          ) : (
            <ReviewStep kyc={kyc} go={go} onBack={() => move(-1)} />
          )}

          {kyc.status !== "approved" && (
            <section className="rounded-[10px] border border-violet-200 bg-brand-soft p-5 sm:p-[22px]">
              <h2 className="font-semibold text-ink">ยืนยันแล้วได้อะไร</h2>
              <p className="text-sm text-slate">
                ป้าย “ยืนยันตัวตนแล้ว” บนประกาศและโปรไฟล์ ลงประกาศในนามนายหน้าได้ และซื้อแพ็กเกจนายหน้าได้
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

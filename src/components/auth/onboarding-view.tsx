"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useId, useState, type ReactNode } from "react";
import { BellRing, Briefcase, House, Search } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice";
import { FormAlert } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { routes } from "@/data/navigation";
import { api } from "@/lib/api/endpoints";
import { safeNext } from "@/lib/auth-gate";
import { cn } from "@/lib/utils";
import { useApplySession, useSession } from "@/providers/session";
import type { UserPreferences, UserRole } from "@/types/api";

const roles: { value: UserRole; title: string; body: string; icon: typeof Search }[] = [
  { value: "seeker", title: "หาบ้านหรือคอนโด", body: "ซื้อหรือเช่าเพื่ออยู่เอง หรือลงทุน", icon: Search },
  { value: "owner", title: "เจ้าของทรัพย์", body: "ขายหรือปล่อยเช่าทรัพย์ของตัวเอง ลงประกาศฟรี 2 ประกาศ", icon: House },
  { value: "agent", title: "นายหน้าอสังหาฯ", body: "ดูแลหลายประกาศ ใช้แดชบอร์ดและแพ็กเกจนายหน้า", icon: Briefcase },
];

const intents: { value: UserPreferences["intent"]; label: string }[] = [
  { value: "buy", label: "ซื้อ" },
  { value: "rent", label: "เช่า" },
  { value: "both", label: "ทั้งสองแบบ" },
];
const types: { value: UserPreferences["types"][number]; label: string }[] = [
  { value: "condo", label: "คอนโด" },
  { value: "house", label: "บ้านเดี่ยว" },
  { value: "townhouse", label: "ทาวน์โฮม" },
];
const lines: { value: UserPreferences["lines"][number]; label: string; dot: string }[] = [
  { value: "bts-sukhumvit", label: "สีเขียวอ่อน", dot: "bg-bts-sukhumvit" },
  { value: "bts-silom", label: "สีเขียวเข้ม", dot: "bg-bts-silom" },
  { value: "mrt-blue", label: "สีน้ำเงิน", dot: "bg-mrt-blue" },
];
const budgets = [
  { value: "0-3m", label: "ไม่เกิน 3 ล้าน" },
  { value: "3-5m", label: "3–5 ล้าน" },
  { value: "5-10m", label: "5–10 ล้าน" },
  { value: "10m+", label: "มากกว่า 10 ล้าน" },
];

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

function PrefRow({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="grid gap-2.5 sm:grid-cols-[140px_1fr] sm:items-center">
      <span id={id} className="text-sm font-medium text-slate">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** B4: what the visitor uses PropertyHub for and what they look for, then alerts (step 2). */
export function OnboardingView() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { user, isPending } = useSession();
  const apply = useApplySession();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<UserRole>("seeker");
  const [prefs, setPrefs] = useState<UserPreferences>({
    intent: "buy",
    types: ["condo"],
    lines: [],
    budget: undefined,
    alerts: { email: true, line: false },
  });
  const save = useMutation({
    mutationFn: api.completeOnboarding,
    onSuccess: ({ data }) => {
      apply(data);
      // Listers go straight to posting; everyone else to where they were headed.
      router.replace(
        data.role === "owner" || data.role === "agent" ? (next === "/" ? routes.postProperty : next) : next,
      );
    },
  });

  if (!isPending && !user) {
    return (
      <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold text-ink">เข้าสู่ระบบเพื่อตั้งค่าบัญชี</h1>
        <Button asChild size="lg">
          <Link href={routes.login({ next: routes.onboarding })}>เข้าสู่ระบบ</Link>
        </Button>
      </main>
    );
  }

  const skip = () => save.mutate({});
  const finish = () => save.mutate({ role, preferences: prefs });

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex h-[68px] max-w-[1180px] items-center justify-between gap-6 px-4 sm:px-8">
          <Logo />
          <div className="flex items-center gap-3 text-sm text-slate">
            <span aria-live="polite">ขั้นที่ {step} จาก 2</span>
            <span
              role="progressbar"
              aria-label="ความคืบหน้าการตั้งค่าบัญชี"
              aria-valuemin={1}
              aria-valuemax={2}
              aria-valuenow={step}
              className="h-1.5 w-28 overflow-hidden rounded-full bg-line"
            >
              <span
                className="block h-full rounded-full bg-brand transition-[width]"
                style={{ width: `${step * 50}%` }}
              />
            </span>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[880px] flex-1 px-4 py-10 sm:px-8 sm:py-14">
        {step === 1 ? (
          <>
            <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.015em] text-ink sm:text-[32px]">
              สวัสดีคุณ{user?.firstName ?? ""} คุณใช้ PropertyHub เพื่ออะไร
            </h1>
            <p className="mt-2 text-[15px] text-slate">เลือกได้ 1 ข้อ เปลี่ยนภายหลังได้ในหน้าบัญชีของฉัน</p>

            <fieldset className="mt-7">
              <legend className="sr-only">การใช้งาน</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {roles.map((r) => {
                  const Icon = r.icon;
                  const on = role === r.value;
                  return (
                    <label
                      key={r.value}
                      className={cn(
                        "relative flex cursor-pointer flex-col gap-2 rounded-lg border-2 p-5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
                        on ? "border-brand bg-[#FAF8FF]" : "border-line hover:border-line-strong",
                      )}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r.value}
                        checked={on}
                        onChange={() => setRole(r.value)}
                        className="absolute top-5 right-5 size-5 accent-brand"
                      />
                      <span className="inline-flex size-11 items-center justify-center rounded-md bg-brand-soft text-brand">
                        <Icon className="size-[22px]" aria-hidden="true" />
                      </span>
                      <strong className="mt-1 font-semibold text-ink">{r.title}</strong>
                      <span className="text-sm text-slate">{r.body}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {role === "seeker" && (
              <section aria-labelledby="pref-title" className="mt-10">
                <h2 id="pref-title" className="text-lg font-semibold text-ink">
                  บอกเราเพิ่มเติม เพื่อแนะนำประกาศให้ตรงขึ้น
                </h2>
                <div className="mt-5 flex flex-col gap-5">
                  <PrefRow label="ต้องการ">
                    {intents.map((o) => (
                      <ChoiceChip
                        key={o.value}
                        type="radio"
                        name="intent"
                        checked={prefs.intent === o.value}
                        onChange={() => setPrefs((p) => ({ ...p, intent: o.value }))}
                      >
                        {o.label}
                      </ChoiceChip>
                    ))}
                  </PrefRow>
                  <PrefRow label="ประเภท">
                    {types.map((o) => (
                      <ChoiceChip
                        key={o.value}
                        name="types"
                        checked={prefs.types.includes(o.value)}
                        onChange={() => setPrefs((p) => ({ ...p, types: toggle(p.types, o.value) }))}
                      >
                        {o.label}
                      </ChoiceChip>
                    ))}
                  </PrefRow>
                  <PrefRow label="ใกล้รถไฟฟ้าสาย">
                    {lines.map((o) => (
                      <ChoiceChip
                        key={o.value}
                        name="lines"
                        checked={prefs.lines.includes(o.value)}
                        onChange={() => setPrefs((p) => ({ ...p, lines: toggle(p.lines, o.value) }))}
                      >
                        <i aria-hidden="true" className={cn("h-1 w-3.5 rounded-full", o.dot)} />
                        {o.label}
                      </ChoiceChip>
                    ))}
                  </PrefRow>
                  <PrefRow label="งบประมาณ">
                    {budgets.map((o) => (
                      <ChoiceChip
                        key={o.value}
                        type="radio"
                        name="budget"
                        checked={prefs.budget === o.value}
                        onChange={() => setPrefs((p) => ({ ...p, budget: o.value }))}
                      >
                        {o.label}
                      </ChoiceChip>
                    ))}
                  </PrefRow>
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
              <BellRing className="size-[26px]" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-[26px] leading-tight font-semibold tracking-[-0.015em] text-ink sm:text-[32px]">
              รับแจ้งเตือนเมื่อมีประกาศที่ตรงใจ
            </h1>
            <p className="mt-2 max-w-[56ch] text-[15px] text-slate">
              เราจะแจ้งเมื่อมีประกาศใหม่ตามที่คุณเลือก และเมื่อประกาศในรายการโปรดลดราคา ปิดได้ทุกเมื่อในหน้าบัญชี
            </p>
            <div className="mt-7 flex flex-col divide-y divide-line rounded-lg border border-line">
              <div className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="text-sm text-slate">อีเมล {user?.email}</span>
                <Switch
                  checked={prefs.alerts.email}
                  onCheckedChange={(email) => setPrefs((p) => ({ ...p, alerts: { ...p.alerts, email } }))}
                  label="แจ้งทางอีเมล"
                />
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="text-sm text-slate">ต้องเพิ่มเพื่อน LINE OA ในขั้นถัดไป</span>
                <Switch
                  checked={prefs.alerts.line}
                  onCheckedChange={(line) => setPrefs((p) => ({ ...p, alerts: { ...p.alerts, line } }))}
                  label="แจ้งทาง LINE"
                />
              </div>
            </div>
          </>
        )}

        {save.isError && <FormAlert className="mt-6">บันทึกไม่สำเร็จ ลองอีกครั้ง</FormAlert>}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          {step === 1 ? (
            <Button variant="link" onClick={skip} disabled={save.isPending}>
              ข้ามขั้นตอนนี้
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setStep(1)}>
              ย้อนกลับ
            </Button>
          )}
          {step === 1 && role === "seeker" ? (
            <Button size="lg" onClick={() => setStep(2)}>
              ถัดไป: เปิดการแจ้งเตือน
            </Button>
          ) : (
            <Button size="lg" onClick={finish} disabled={save.isPending}>
              {save.isPending ? "กำลังบันทึก..." : "เสร็จสิ้น"}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

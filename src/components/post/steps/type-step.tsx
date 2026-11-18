"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChoiceChip, RadioCard, SegmentedControl } from "@/components/ui/choice";
import { propertyTypeLabels } from "@/data/catalog";
import { listingQuotaQuery } from "@/lib/api/queries";
import type { DealType, PosterKind } from "@/types/api";
import type { PropertyType } from "@/types/property";
import { GroupError, req, WizardCard, type StepProps } from "./shared";

const kinds: { value: PosterKind; title: string; body: React.ReactNode }[] = [
  { value: "owner", title: "เจ้าของทรัพย์", body: "ลงฟรี 2 ประกาศ ได้ป้าย “เจ้าของขายเอง”" },
  {
    value: "agent",
    title: "นายหน้า / เอเจนซี",
    body: (
      <>
        ต้อง
        <Link href="/dashboard/verify" className="text-brand-strong underline underline-offset-4">
          ยืนยันตัวตน
        </Link>
        ก่อนเผยแพร่ ลงได้ตามแพ็กเกจ
      </>
    ),
  },
  { value: "developer", title: "ผู้พัฒนาโครงการ", body: "ลงโครงการใหม่ผ่านทีมพาร์ทเนอร์ของเรา" },
];

const deals: { value: DealType; label: string }[] = [
  { value: "sale", label: "ขาย" },
  { value: "rent", label: "ให้เช่า" },
  { value: "both", label: "ขายหรือให้เช่า" },
];

const types = Object.entries(propertyTypeLabels) as [PropertyType, string][];

/** C1: who is posting, sale or rent, and the property type. */
export function TypeStep({ values, set, errors }: StepProps) {
  const quota = useQuery({ ...listingQuotaQuery, enabled: values.posterKind === "owner" });

  return (
    <>
      <WizardCard
        id="field-posterKind"
        title="คุณเป็น"
        sub="ใช้แสดงบนประกาศ ผู้หาบ้านจะเห็นว่าติดต่อเจ้าของหรือนายหน้า"
      >
        <div role="radiogroup" aria-label="คุณเป็น" className="grid gap-3 md:grid-cols-3">
          {kinds.map((k) => (
            <RadioCard
              key={k.value}
              name="posterKind"
              checked={values.posterKind === k.value}
              onChange={() => set({ posterKind: k.value })}
              title={k.title}
              description={k.body}
            />
          ))}
        </div>
        {values.posterKind === "developer" && (
          <p className="mt-4 rounded-md bg-brand-soft px-4 py-3 text-sm text-ink">
            ทีมพาร์ทเนอร์ช่วยตั้งหน้าโครงการ แบบห้อง และความคืบหน้าก่อสร้างให้ ติดต่อ{" "}
            <a
              href="mailto:partners@propertyhub.example"
              className="font-medium text-brand-strong underline underline-offset-4"
            >
              partners@propertyhub.example
            </a>
          </p>
        )}
        <GroupError id="posterKind-error" message={errors.posterKind} />
      </WizardCard>

      <WizardCard title="ประกาศเพื่อ">
        <SegmentedControl label="ประกาศเพื่อ" value={values.deal} options={deals} onChange={(deal) => set({ deal })} />
        <p className="mt-2 text-[13px] text-slate">เลือก “ขายหรือให้เช่า” แล้วใส่ได้ทั้งราคาขายและค่าเช่าในขั้นที่ 5</p>
      </WizardCard>

      <WizardCard id="field-propertyType" title={<>ประเภททรัพย์{req}</>}>
        <div
          role="radiogroup"
          aria-label="ประเภททรัพย์"
          aria-describedby={errors.propertyType ? "propertyType-error" : undefined}
          className="flex flex-wrap gap-2"
        >
          {types.map(([value, label]) => (
            <ChoiceChip
              key={value}
              type="radio"
              name="propertyType"
              checked={values.propertyType === value}
              onChange={() => set({ propertyType: value })}
            >
              {label}
            </ChoiceChip>
          ))}
        </div>
        <GroupError id="propertyType-error" message={errors.propertyType} />
      </WizardCard>

      {values.posterKind === "owner" && quota.data && (
        <p className="text-sm text-slate">
          โควตาประกาศฟรีของคุณ: ใช้ไป {quota.data.data.used} จาก {quota.data.data.limit} รายการ{" "}
          <Link href="/pricing" className="font-medium text-brand-strong underline-offset-4 hover:underline">
            ดูแพ็กเกจสำหรับนายหน้า
          </Link>
        </p>
      )}
    </>
  );
}

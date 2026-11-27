"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { RadioCard } from "@/components/ui/choice";
import { Field, fieldA11y, NativeSelect } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/query-state";
import { Switch } from "@/components/ui/switch";
import { propertyTypeLabels } from "@/data/catalog";
import { promotionsQuery, propertyQueries } from "@/lib/api/queries";
import { formatNumber } from "@/lib/format";
import { promotionCatalog } from "@/lib/post-wizard";
import { cn } from "@/lib/utils";
import type { DraftValues, PostStep } from "@/types/api";
import { NumberField } from "./number-field";
import { GroupError, req, WizardCard, type StepProps } from "./shared";

const percentile = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

/** Where the asking price per m² sits among sale listings near the same station. */
function MarketCompare({ values }: { values: DraftValues }) {
  const station = values.stations[0];
  const enabled = Boolean(
    station && values.price && values.area && values.propertyType && values.propertyType !== "land",
  );
  const { data, isPending } = useQuery({
    ...propertyQueries.list({ mode: "buy", type: values.propertyType, station, limit: 100 }),
    enabled,
  });
  if (!enabled) return null;
  if (isPending) return <Skeleton className="mt-5 h-20 w-full" />;
  const perSqm = (data?.data ?? [])
    .filter((p) => p.area > 0)
    .map((p) => p.price / p.area)
    .sort((a, b) => a - b);
  if (perSqm.length < 3) return null;

  const low = Math.round(percentile(perSqm, 0.25) / 1000) * 1000;
  const high = Math.round(percentile(perSqm, 0.75) / 1000) * 1000;
  const mine = values.price! / values.area!;
  const span = Math.max(1, high - low);
  const pos = Math.min(100, Math.max(0, ((mine - low) / span) * 70 + 15));
  const verdict = mine < low ? "ราคาคุณต่ำกว่าตลาด" : mine > high ? "ราคาคุณสูงกว่าตลาด" : "ราคาคุณอยู่ช่วงกลางตลาด";

  return (
    <div className="mt-5 rounded-lg bg-mist p-4">
      <p className="text-sm font-medium text-ink">เทียบกับประกาศขายใกล้สถานีเดียวกัน ({perSqm.length} ประกาศ)</p>
      <div
        aria-hidden="true"
        className="relative mt-4 h-2 rounded-full bg-[linear-gradient(90deg,var(--color-line)_15%,var(--color-violet-200)_15%,var(--color-violet-200)_85%,var(--color-line)_85%)]"
      >
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand shadow"
          style={{ left: `${pos}%` }}
        />
      </div>
      <p className="mt-2.5 flex justify-between gap-2 text-[13px] text-slate tabular-nums">
        <span>฿{formatNumber(low)}/ตร.ม.</span>
        <span className="font-medium text-violet-700">{verdict}</span>
        <span>฿{formatNumber(high)}/ตร.ม.</span>
      </p>
    </div>
  );
}

function Review({ stepHref, values }: Pick<StepProps, "stepHref" | "values">) {
  const rows: { step: PostStep; label: string; text: unknown[] }[] = [
    {
      step: "type",
      label: "ประเภท",
      text: [
        values.propertyType && propertyTypeLabels[values.propertyType],
        { sale: "ขาย", rent: "ให้เช่า", both: "ขายหรือให้เช่า" }[values.deal],
        { owner: "เจ้าของทรัพย์", agent: "นายหน้า", developer: "ผู้พัฒนาโครงการ" }[values.posterKind],
      ],
    },
    {
      step: "location",
      label: "ทำเล",
      text: [
        values.projectName,
        values.district,
        values.stations.length ? `ใกล้ ${values.stations.join(", ")}` : undefined,
      ],
    },
    {
      step: "details",
      label: "รายละเอียด",
      text: [
        values.bedrooms !== undefined && (values.bedrooms === 0 ? "สตูดิโอ" : `${values.bedrooms} นอน`),
        values.bathrooms && `${values.bathrooms} น้ำ`,
        values.area && `${values.area} ${values.propertyType === "land" ? "ตร.ว." : "ตร.ม."}`,
        values.floor && `ชั้น ${values.floor}`,
      ],
    },
    {
      step: "photos",
      label: "รูปภาพ",
      text: [
        `${values.photos.filter((p) => p.status === "ready" && !p.isFloorPlan).length} รูป`,
        values.photos.some((p) => p.isFloorPlan && p.status === "ready") && "มีแปลนห้อง",
        values.videoUrl && "มีวิดีโอ",
      ],
    },
  ];
  return (
    <dl className="divide-y divide-line rounded-lg border border-line">
      {rows.map((r) => (
        <div key={r.step} className="flex items-center gap-3 px-4 py-3">
          <dt className="w-24 shrink-0 text-sm text-slate">{r.label}</dt>
          <dd className="min-w-0 flex-1 text-[15px] text-ink">{r.text.filter(Boolean).join("  ")}</dd>
          <Link
            href={stepHref(r.step)}
            className="shrink-0 text-sm font-medium text-brand-strong underline-offset-4 hover:underline"
            aria-label={`แก้ไข${r.label}`}
          >
            แก้ไข
          </Link>
        </div>
      ))}
    </dl>
  );
}

/** C5: price, optional promotion, a last review and the confirmation. */
export function PublishStep({ stepHref, editing, values, set, errors, touch }: StepProps) {
  const id = useId();
  const { data: promos } = useQuery({ ...promotionsQuery, enabled: !editing });
  const options = promos?.data ?? promotionCatalog;
  const sale = values.deal !== "rent";
  const rent = values.deal !== "sale";
  const perSqm =
    sale && values.price && values.area && values.propertyType !== "land"
      ? Math.round(values.price / values.area)
      : undefined;

  return (
    <>
      <WizardCard title="ราคา">
        <div className="grid gap-4 sm:grid-cols-2">
          {sale && (
            <div id="field-price" className="scroll-mt-40">
              <NumberField
                id={`${id}-price`}
                label={<>ราคาขาย{req}</>}
                suffix="฿"
                grouped
                value={values.price}
                onValue={(price) => set({ price })}
                onBlur={() => touch("price")}
                error={errors.price}
                hint={perSqm ? `ราคาต่อ ตร.ม. ฿${formatNumber(perSqm)}` : undefined}
              />
            </div>
          )}
          {rent && (
            <div id="field-rentPrice" className="scroll-mt-40">
              <NumberField
                id={`${id}-rent`}
                label={<>ค่าเช่าต่อเดือน{req}</>}
                suffix="฿"
                grouped
                value={values.rentPrice}
                onValue={(rentPrice) => set({ rentPrice })}
                onBlur={() => touch("rentPrice")}
                error={errors.rentPrice}
              />
            </div>
          )}
          {values.propertyType === "condo" && (
            <NumberField
              id={`${id}-fee`}
              label="ค่าส่วนกลาง"
              suffix="฿/เดือน"
              grouped
              value={values.commonFee}
              onValue={(commonFee) => set({ commonFee })}
            />
          )}
        </div>
        {sale && <MarketCompare values={values} />}
        <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3">
          <Switch
            checked={values.negotiable}
            onCheckedChange={(negotiable) => set({ negotiable })}
            label="ต่อรองราคาได้"
          />
          {sale && (
            <Field id={`${id}-transfer`} label="ค่าโอน" className="min-w-[200px]">
              <NativeSelect
                {...fieldA11y(`${id}-transfer`)}
                value={values.transferFee}
                onChange={(e) => set({ transferFee: e.target.value as DraftValues["transferFee"] })}
              >
                <option value="split">แบ่งคนละครึ่ง</option>
                <option value="buyer">ผู้ซื้อจ่าย</option>
                <option value="seller">ผู้ขายจ่าย</option>
              </NativeSelect>
            </Field>
          )}
        </div>
      </WizardCard>

      {/* Edit mode: promotions are bought from the dashboard (Boost), not while editing. */}
      {!editing && (
        <WizardCard
          title={
            <>
              เพิ่มการมองเห็น <span className="text-sm font-normal text-slate">(ไม่บังคับ)</span>
            </>
          }
          sub="ซื้อทีหลังจากแดชบอร์ดได้ ราคารวม VAT แล้ว"
        >
          <div role="radiogroup" aria-label="เพิ่มการมองเห็น" className="flex flex-col gap-2.5">
            {options.map((o) => (
              <RadioCard
                key={o.id}
                name="promotion"
                checked={values.promotion === o.id}
                onChange={() => set({ promotion: o.id })}
                disabled={o.slotsLeft === 0}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {o.title}
                    {o.badge && (
                      <span className="rounded-sm bg-violet-100 px-1.5 text-[11px] font-semibold text-violet-700">
                        {o.badge}
                      </span>
                    )}
                    {o.slotsLeft !== undefined && (
                      <span
                        className={cn(
                          "rounded-sm px-1.5 text-[11px] font-semibold",
                          o.slotsLeft ? "bg-warning-soft text-warning" : "bg-mist text-slate",
                        )}
                      >
                        {o.slotsLeft ? `เหลือ ${o.slotsLeft} ที่` : "เต็มวันนี้"}
                      </span>
                    )}
                  </span>
                }
                description={o.description}
                aside={o.price ? `฿${formatNumber(o.price)}` : "ฟรี"}
              />
            ))}
          </div>
        </WizardCard>
      )}

      <WizardCard id="field-confirmed" title={editing ? "ตรวจสอบข้อมูล" : "ตรวจสอบก่อนเผยแพร่"}>
        <Review stepHref={stepHref} values={values} />
        {/* Edit mode: confirmed when the listing was first published. */}
        {!editing && (
          <>
            <label className="mt-5 flex gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={values.confirmed}
                onChange={(e) => set({ confirmed: e.target.checked })}
                aria-invalid={errors.confirmed ? true : undefined}
                aria-describedby={errors.confirmed ? "confirmed-error" : undefined}
                className="mt-0.5 size-5 shrink-0 accent-brand"
              />
              <span>
                ฉันยืนยันว่าข้อมูลถูกต้อง เป็นเจ้าของหรือได้รับมอบหมายให้ลงประกาศ และยอมรับ{" "}
                <Link href="/legal/listing-rules" className="text-brand-strong underline underline-offset-4">
                  กฎการลงประกาศ
                </Link>
              </span>
            </label>
            <GroupError id="confirmed-error" message={errors.confirmed} />
          </>
        )}
      </WizardCard>
    </>
  );
}

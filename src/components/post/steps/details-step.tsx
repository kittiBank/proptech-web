"use client";

import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoiceChip, SegmentedControl } from "@/components/ui/choice";
import { Field, fieldA11y, inputClass, NativeSelect, TextField } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { amenityLabels, featurePoolByType } from "@/data/amenities";
import { stationsQuery } from "@/lib/api/queries";
import { DESCRIPTION_MIN, draftDescription, TITLE_MAX } from "@/lib/post-wizard";
import { cn } from "@/lib/utils";
import type { DraftValues } from "@/types/api";
import { NumberField } from "./number-field";
import { GroupError, req, WizardCard, type StepProps } from "./shared";

const bedroomOptions = [
  { value: 0, label: "สตูดิโอ" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4+" },
];
const bathroomOptions = bedroomOptions.slice(1);
const facings = [
  "ทิศเหนือ",
  "ทิศใต้",
  "ทิศตะวันออก",
  "ทิศตะวันตก",
  "ทิศตะวันออกเฉียงเหนือ",
  "ทิศตะวันออกเฉียงใต้",
  "ทิศตะวันตกเฉียงเหนือ",
  "ทิศตะวันตกเฉียงใต้",
];
const furnishings: { value: NonNullable<DraftValues["furnishing"]>; label: string }[] = [
  { value: "unfurnished", label: "ห้องเปล่า" },
  { value: "partly", label: "ตกแต่งบางส่วน" },
  { value: "fully", label: "ตกแต่งครบ" },
];

function ChipGroup({
  label,
  name,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  name: string;
  value: number | undefined;
  options: { value: number; label: string }[];
  onChange: (v: number) => void;
  error?: string;
}) {
  return (
    <div id={`field-${name}`} className="scroll-mt-40">
      <p id={`${name}-label`} className="mb-2 text-sm font-medium text-ink">
        {label}
        {req}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`${name}-label`}
        aria-describedby={error ? `${name}-error` : undefined}
        className="flex flex-wrap gap-2"
      >
        {options.map((o) => (
          <ChoiceChip
            key={o.value}
            type="radio"
            name={name}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          >
            {o.label}
          </ChoiceChip>
        ))}
      </div>
      <GroupError id={`${name}-error`} message={error} />
    </div>
  );
}

/** C3: size and rooms, furnishing and amenities, title and description. */
export function DetailsStep({ values, set, errors, touch }: StepProps) {
  const id = useId();
  const { data: lines } = useQuery(stationsQuery);
  const type = values.propertyType;
  const rooms = type !== "land" && type !== "commercial";
  const isCondo = type === "condo";
  const features = type ? featurePoolByType[type] : [];
  const title = values.title ?? "";
  const description = values.description ?? "";

  const stationNames = Object.fromEntries(
    (lines?.data ?? []).flatMap((l) =>
      l.stations.map((s) => [s.stationCode, `${l.id === "mrt-blue" ? "MRT" : "BTS"} ${s.name}`]),
    ),
  );
  type NumberKey = "area" | "floor" | "totalFloors" | "yearBuilt" | "parking";
  const num = (key: NumberKey, decimal = false) => ({
    value: values[key],
    onValue: (n: number | undefined) => set({ [key]: n }),
    onBlur: () => touch(key),
    error: errors[key],
    decimal,
  });

  return (
    <>
      <WizardCard title="ขนาดและห้อง">
        <div className="flex flex-col gap-5">
          {rooms && (
            <ChipGroup
              label="ห้องนอน"
              name="bedrooms"
              value={values.bedrooms}
              options={bedroomOptions}
              onChange={(bedrooms) => set({ bedrooms })}
              error={errors.bedrooms}
            />
          )}
          {type !== "land" && (
            <ChipGroup
              label="ห้องน้ำ"
              name="bathrooms"
              value={values.bathrooms}
              options={bathroomOptions}
              onChange={(bathrooms) => set({ bathrooms })}
              error={errors.bathrooms}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div id="field-area" className="scroll-mt-40">
              <NumberField
                id={`${id}-area`}
                label={
                  <>
                    {type === "land" ? "ขนาดที่ดิน" : "พื้นที่ใช้สอย"}
                    {req}
                  </>
                }
                suffix={type === "land" ? "ตร.ว." : "ตร.ม."}
                {...num("area", true)}
              />
            </div>
            {type !== "land" && (
              <div id="field-floor" className="scroll-mt-40">
                <NumberField
                  id={`${id}-floor`}
                  label={
                    <>
                      {isCondo ? "อยู่ชั้น" : "จำนวนชั้น"}
                      {isCondo && req}
                    </>
                  }
                  {...num("floor")}
                />
              </div>
            )}
            {isCondo && (
              <NumberField
                id={`${id}-totalFloors`}
                label="อาคารสูง"
                suffix="ชั้น"
                hint={values.projectName && values.totalFloors ? "เติมจากข้อมูลโครงการ" : undefined}
                {...num("totalFloors")}
              />
            )}
            {rooms && (
              <Field id={`${id}-facing`} label="ทิศของห้อง">
                <NativeSelect
                  {...fieldA11y(`${id}-facing`)}
                  value={values.facing ?? ""}
                  onChange={(e) => set({ facing: e.target.value || undefined })}
                >
                  <option value="">ไม่ระบุ</option>
                  {facings.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
            {type !== "land" && (
              <NumberField
                id={`${id}-yearBuilt`}
                label="ปีที่สร้างเสร็จ (พ.ศ.)"
                placeholder="2563"
                {...num("yearBuilt")}
              />
            )}
            {type !== "land" && <NumberField id={`${id}-parking`} label="ที่จอดรถ" suffix="คัน" {...num("parking")} />}
          </div>
        </div>
      </WizardCard>

      {rooms && (
        <WizardCard title="การตกแต่งและสิ่งอำนวยความสะดวก">
          <SegmentedControl
            label="การตกแต่ง"
            value={values.furnishing}
            options={furnishings}
            onChange={(furnishing) => set({ furnishing })}
          />
          {features.length > 0 && (
            <>
              <p className="mt-5 mb-2 text-sm font-medium text-ink">{isCondo ? "ในห้องมี" : "ในบ้านมี"}</p>
              <div className="flex flex-wrap gap-2">
                {features.map((f) => (
                  <ChoiceChip
                    key={f}
                    name="features"
                    checked={values.features.includes(f)}
                    onChange={() =>
                      set({
                        features: values.features.includes(f)
                          ? values.features.filter((x) => x !== f)
                          : [...values.features, f],
                      })
                    }
                  >
                    {amenityLabels[f]}
                  </ChoiceChip>
                ))}
              </div>
            </>
          )}
          <div className="mt-4">
            <Switch
              checked={values.petFriendly}
              onCheckedChange={(petFriendly) => set({ petFriendly })}
              label="เลี้ยงสัตว์ได้"
            />
          </div>
        </WizardCard>
      )}

      <WizardCard title="หัวข้อและรายละเอียด">
        <div className="flex flex-col gap-5">
          <div id="field-title" className="scroll-mt-40">
            <TextField
              id={`${id}-title`}
              label={<>หัวข้อประกาศ{req}</>}
              labelAside={
                <span
                  className={cn("text-[13px] tabular-nums", title.length > TITLE_MAX ? "text-danger" : "text-slate")}
                >
                  {title.length} / {TITLE_MAX}
                </span>
              }
              hint="ห้ามใส่เบอร์โทรหรือ LINE ID ในหัวข้อ"
              placeholder="เช่น 2 ห้องนอน ใกล้ BTS ตกแต่งครบ วิวเมือง"
              value={title}
              onChange={(e) => set({ title: e.target.value })}
              onBlur={() => touch("title")}
              error={errors.title}
            />
          </div>
          <div id="field-description" className="scroll-mt-40">
            <Field
              id={`${id}-description`}
              label={<>รายละเอียด{req}</>}
              labelAside={
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto gap-1.5"
                  onClick={() => set({ description: draftDescription(values, stationNames) })}
                >
                  <Sparkles aria-hidden="true" />
                  ช่วยร่างจากข้อมูลที่กรอก
                </Button>
              }
              error={errors.description}
              hint={`อย่างน้อย ${DESCRIPTION_MIN} ตัวอักษร  ตอนนี้ ${description.trim().length}`}
            >
              <textarea
                {...fieldA11y(`${id}-description`, errors.description, "hint")}
                rows={7}
                value={description}
                onChange={(e) => set({ description: e.target.value })}
                onBlur={() => touch("description")}
                className={cn(inputClass, "resize-y py-3 leading-relaxed")}
              />
            </Field>
          </div>
        </div>
      </WizardCard>
    </>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Building2, Hand, MapPin } from "lucide-react";
import { lineColor } from "@/components/property/transit-badge";
import { RadioCard } from "@/components/ui/choice";
import { TextField } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/query-state";
import { nearbyStationsQuery, projectPlacesQuery } from "@/lib/api/queries";
import { formatDistance, walkingMinutes } from "@/lib/geo";
import { MAX_STATIONS } from "@/lib/post-wizard";
import { cn } from "@/lib/utils";
import type { DraftValues, ProjectPlace } from "@/types/api";
import { GroupError, WizardCard, type StepProps } from "./shared";

const PinMap = dynamic(() => import("../pin-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

/** Project-name combobox: picking a project fills the address, pin and building height. */
function ProjectSearch({ values, set }: Pick<StepProps, "values" | "set">) {
  const id = useId();
  const [query, setQuery] = useState(values.projectName ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { data } = useQuery(projectPlacesQuery(query));
  const results = open && query.trim().length >= 2 ? (data?.data ?? []) : [];
  const showList = open && query.trim().length >= 2;

  const pick = (place: ProjectPlace) => {
    setQuery(place.name);
    setOpen(false);
    set({
      projectName: place.name,
      district: place.district,
      province: place.province,
      subdistrict: place.subdistrict || values.subdistrict,
      road: place.road ?? values.road,
      point: place.point,
      totalFloors: place.totalFloors ?? values.totalFloors,
      stations: [],
    });
  };

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="sr-only">
        ชื่อโครงการหรือที่อยู่
      </label>
      <input
        id={`${id}-input`}
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        value={query}
        placeholder="เช่น แอสเตอร์ สาทร"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
          set({ projectName: e.target.value || undefined });
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            if (results[active]) pick(results[active]);
            else setOpen(false);
          } else if (e.key === "Escape") setOpen(false);
        }}
        className="h-12 w-full rounded-md border border-line-strong bg-white px-3.5 text-[15px] text-ink outline-none focus:border-brand focus:ring-3 focus:ring-violet-100"
      />
      {showList && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label="โครงการที่ตรงกัน"
          className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-md border border-line bg-white shadow-[0_12px_32px_rgba(26,22,48,.12)]"
        >
          {results.map((place, i) => (
            <li
              key={place.name}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={active === i}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(place);
              }}
              className={cn("flex cursor-pointer gap-3 px-4 py-3 hover:bg-mist", active === i && "bg-mist")}
            >
              <Building2 className="mt-0.5 size-[18px] shrink-0 text-brand" aria-hidden="true" />
              <span>
                <span className="block font-semibold text-ink">{place.name}</span>
                <span className="block text-[13px] text-slate">
                  {place.district} {place.province}
                  {place.listingCount > 0 && `  มี ${place.listingCount} ประกาศ`}
                </span>
              </span>
            </li>
          ))}
          <li
            id={`${id}-opt-${results.length}`}
            role="option"
            aria-selected={active === results.length}
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen(false);
            }}
            className={cn(
              "cursor-pointer border-t border-line px-4 py-3 text-sm text-slate hover:bg-mist",
              active === results.length && "bg-mist",
            )}
          >
            {results.length ? "ไม่ใช่โครงการเหล่านี้ กรอกที่อยู่เอง" : "ไม่พบโครงการ กรอกที่อยู่เอง"}
          </li>
        </ul>
      )}
    </div>
  );
}

const addressFields: { key: keyof DraftValues & string; label: string; autoComplete?: string }[] = [
  { key: "houseNo", label: "เลขที่ / อาคาร", autoComplete: "address-line1" },
  { key: "soi", label: "ซอย" },
  { key: "road", label: "ถนน", autoComplete: "address-line2" },
  { key: "subdistrict", label: "แขวง / ตำบล" },
  { key: "district", label: "เขต / อำเภอ", autoComplete: "address-level2" },
  { key: "province", label: "จังหวัด", autoComplete: "address-level1" },
];

function NearbyStations({ values, set, errors }: Pick<StepProps, "values" | "set" | "errors">) {
  const point = values.point;
  const { data, isPending } = useQuery({
    ...nearbyStationsQuery(point ?? { lat: 0, lng: 0 }),
    enabled: Boolean(point),
  });
  const stations = data?.data ?? [];

  if (!point) return <p className="text-sm text-slate">ปักหมุดบนแผนที่ก่อน แล้วเราจะหาสถานีที่ใกล้ที่สุดให้</p>;
  if (isPending) return <Skeleton className="h-24 w-full" />;
  if (stations.length === 0) {
    return <p className="text-sm text-slate">ไม่มีสถานีรถไฟฟ้าในระยะ 1.5 กม. ประกาศจะแสดงทำเลตามเขตแทน</p>;
  }

  const toggle = (code: string) =>
    set({
      stations: values.stations.includes(code) ? values.stations.filter((c) => c !== code) : [...values.stations, code],
    });

  return (
    <>
      <p className="-mt-3 mb-4 text-sm text-slate">
        เราพบ {stations.length} สถานีในระยะ 1.5 กม. เลือกได้สูงสุด {MAX_STATIONS} สถานีเพื่อแสดงบนประกาศ
      </p>
      <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
        {stations.map(({ station, distance }) => {
          const checked = values.stations.includes(station.code);
          const full = !checked && values.stations.length >= MAX_STATIONS;
          return (
            <li key={station.code}>
              <label
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2.5",
                  full && "cursor-not-allowed opacity-60",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={full}
                  onChange={() => toggle(station.code)}
                  className="size-5 shrink-0 accent-brand"
                />
                <span
                  className={cn(
                    "inline-flex h-5 min-w-9 items-center justify-center rounded-sm px-1 text-[11px] font-semibold text-white",
                    lineColor[station.line],
                  )}
                >
                  {station.code}
                </span>
                <span className="flex-1 text-[15px] text-ink">{station.name}</span>
                <span className="text-sm text-slate tabular-nums">
                  {formatDistance(distance)} เดิน {walkingMinutes(distance)} นาที
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <GroupError id="stations-error" message={errors.stations} />
    </>
  );
}

/** C2: address (from a project or typed), pin on the map, nearby stations. */
export function LocationStep({ values, set, errors, touch }: StepProps) {
  const id = useId();
  return (
    <>
      <WizardCard id="field-road" title="ชื่อโครงการหรือที่อยู่" sub="พิมพ์ชื่อโครงการ เราจะเติมที่อยู่และตำแหน่งให้">
        <ProjectSearch values={values} set={set} />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {addressFields.map((f) => (
            <TextField
              key={f.key}
              id={`${id}-${f.key}`}
              name={f.key}
              label={f.label}
              autoComplete={f.autoComplete}
              value={String(values[f.key] ?? "")}
              onChange={(e) => set({ [f.key]: e.target.value || undefined })}
              onBlur={() => touch(f.key)}
              error={errors[f.key]}
            />
          ))}
        </div>
      </WizardCard>

      <WizardCard
        id="field-point"
        title="ปักหมุดตำแหน่ง"
        sub="ลากหมุดให้ตรงอาคาร หรือแตะแผนที่เพื่อวางหมุด ระยะถึงสถานีคำนวณจากตำแหน่งนี้"
      >
        <div
          className={cn(
            "relative h-[300px] overflow-hidden rounded-lg border bg-mist sm:h-[340px]",
            errors.point ? "border-danger" : "border-line",
          )}
        >
          <PinMap point={values.point} onChange={(point) => set({ point, stations: [] })} />
          {!values.point && (
            <span className="pointer-events-none absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-white/95 px-3 py-2 text-sm text-ink shadow">
              <Hand className="size-4 text-brand" aria-hidden="true" />
              แตะแผนที่เพื่อปักหมุด
            </span>
          )}
        </div>
        {values.point && (
          <p className="mt-2 flex items-center gap-1.5 text-[13px] text-slate tabular-nums">
            <MapPin className="size-3.5" aria-hidden="true" />
            {values.point.lat.toFixed(5)}, {values.point.lng.toFixed(5)}
          </p>
        )}
        <GroupError id="point-error" message={errors.point} />
        <div role="radiogroup" aria-label="การแสดงตำแหน่ง" className="mt-4 grid gap-3 sm:grid-cols-2">
          <RadioCard
            name="exactLocation"
            checked={!values.exactLocation}
            onChange={() => set({ exactLocation: false })}
            title="แสดงตำแหน่งโดยประมาณ"
            description="วงกลมรัศมี 200 ม. แนะนำสำหรับเจ้าของ"
          />
          <RadioCard
            name="exactLocation"
            checked={values.exactLocation}
            onChange={() => set({ exactLocation: true })}
            title="แสดงตำแหน่งจริง"
            description="ผู้หาบ้านเห็นอาคารที่แน่นอน"
          />
        </div>
      </WizardCard>

      <WizardCard title="สถานีรถไฟฟ้าใกล้เคียง">
        <NearbyStations values={values} set={set} errors={errors} />
      </WizardCard>
    </>
  );
}

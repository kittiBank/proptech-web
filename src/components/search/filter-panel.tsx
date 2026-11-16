"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { PriceOptions, priceLabel, TypeOptions } from "@/components/search/search-options";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { lineColor } from "@/components/property/transit-badge";
import { areaRanges, bedroomOptions } from "@/data/catalog";
import { stationsQuery } from "@/lib/api/queries";
import type { SearchState } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import type { PropertyType } from "@/types/property";

interface FilterPanelProps {
  state: SearchState;
  onChange: (change: Partial<SearchState>) => void;
  /** Distinguishes the sidebar and sheet copies so their ids do not clash. */
  idPrefix: string;
  className?: string;
}

const selectBox =
  "h-11 rounded-md border border-line-strong bg-white px-3 transition-colors hover:border-ink focus-visible:border-brand";

function FilterGroup({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-2.5 border-b border-line py-5 first:pt-0">
      <h3 id={id} className="text-[15px] font-semibold text-ink">
        {label}
      </h3>
      {children}
    </div>
  );
}

/** Every filter except Buy/Rent and the keyword, which sit in the search bar. */
export function FilterPanel({ state, onChange, idPrefix, className }: FilterPanelProps) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className={cn("flex flex-col", className)}>
      <FilterGroup id={id("type")} label="ประเภท">
        <Select value={state.type} onValueChange={(v) => onChange({ type: v as PropertyType | "all" })}>
          <SelectTrigger aria-labelledby={id("type")} className={selectBox}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <TypeOptions />
          </SelectContent>
        </Select>
      </FilterGroup>

      <FilterGroup id={id("price")} label={priceLabel(state.mode)}>
        <Select value={state.price} onValueChange={(v) => onChange({ price: v })}>
          <SelectTrigger aria-labelledby={id("price")} className={selectBox}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <PriceOptions mode={state.mode} />
          </SelectContent>
        </Select>
      </FilterGroup>

      <FilterGroup id={id("beds")} label="ห้องนอน">
        <div className="grid grid-cols-5 gap-1 rounded-md bg-mist p-1">
          {bedroomOptions.map((option) => {
            const active = state.bedrooms === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ bedrooms: option.value })}
                className={cn(
                  "h-9 rounded-sm text-sm font-medium text-slate tabular-nums transition-colors hover:text-ink",
                  active && "bg-white text-ink ring-1 ring-line-strong",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup id={id("area")} label="พื้นที่ใช้สอย">
        <Select value={state.area} onValueChange={(v) => onChange({ area: v })}>
          <SelectTrigger aria-labelledby={id("area")} className={selectBox}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {areaRanges.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterGroup>

      <FilterGroup id={id("stations")} label="ใกล้รถไฟฟ้า">
        <StationChecklist selected={state.stations} onChange={(stations) => onChange({ stations })} />
      </FilterGroup>
    </div>
  );
}

/** Stations grouped by line, any number selectable. */
export function StationChecklist({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (stations: string[]) => void;
}) {
  const { data: lines, isPending, isError } = useQuery({ ...stationsQuery, select: (res) => res.data });

  if (isPending) return <p className="text-sm text-slate">กำลังโหลดสถานี…</p>;
  if (isError || !lines) return <p className="text-sm text-slate">โหลดรายชื่อสถานีไม่สำเร็จ</p>;

  const toggle = (code: string) =>
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);

  return (
    <div className="flex flex-col gap-4">
      {lines.map((line) => (
        <fieldset key={line.id} className="flex flex-col gap-0.5">
          <legend className="mb-1.5 flex items-center gap-2 text-[13px] font-medium text-slate">
            <span className={cn("h-1 w-4 rounded-full", lineColor[line.id])} aria-hidden="true" />
            {line.name}
          </legend>
          {line.stations.map((st) => {
            const checked = selected.includes(st.stationCode);
            return (
              <label
                key={st.stationCode}
                className="flex h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-[15px] text-ink hover:bg-mist has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand"
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(st.stationCode)} className="sr-only" />
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex size-5 shrink-0 items-center justify-center rounded-sm border transition-colors",
                    checked ? "border-brand bg-brand text-white" : "border-line-strong bg-white",
                  )}
                >
                  {checked && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span
                  className={cn(
                    "inline-flex h-5 min-w-9 items-center justify-center rounded-sm px-1 text-[11px] font-semibold text-white tabular-nums",
                    lineColor[line.id],
                  )}
                >
                  {st.stationCode}
                </span>
                <span className="min-w-0 truncate">{st.name}</span>
              </label>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}

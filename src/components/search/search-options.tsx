"use client";

import { useQuery } from "@tanstack/react-query";
import { TrainFront } from "lucide-react";
import { lineColor } from "@/components/property/transit-badge";
import { SelectGroup, SelectItem, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { priceRanges, propertyTypeLabels } from "@/data/catalog";
import { stationsQuery } from "@/lib/api/queries";
import { cn } from "@/lib/utils";
import type { ListingMode, PropertyType } from "@/types/property";

/**
 * Option lists shared by the hero search and the sticky header search, so both
 * forms always offer the same choices for the same draft filters.
 */

const typeOptions = Object.entries(propertyTypeLabels) as [PropertyType, string][];

/** Stations grouped by line. Until `GET /stations` answers, only "any station" is offered. */
export function StationOptions() {
  const { data: lines = [] } = useQuery({ ...stationsQuery, select: (res) => res.data });

  return (
    <>
      <SelectItem value="any">
        <span className="inline-flex items-center gap-2">
          <TrainFront className="size-4 text-brand" aria-hidden="true" />
          ทุกสถานี
        </span>
      </SelectItem>
      {lines.map((line) => (
        <SelectGroup key={line.id}>
          <SelectSeparator />
          <SelectLabel>
            <span className={cn("h-1 w-4 rounded-full", lineColor[line.id])} aria-hidden="true" />
            {line.name}
          </SelectLabel>
          {line.stations.map((st) => (
            <SelectItem key={st.stationCode} value={st.stationCode}>
              <span className="inline-flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-5 min-w-9 items-center justify-center rounded-sm px-1 text-[11px] font-semibold text-white tabular-nums",
                    lineColor[line.id],
                  )}
                >
                  {st.stationCode}
                </span>
                {st.name}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      ))}
    </>
  );
}

export function TypeOptions() {
  return (
    <>
      <SelectItem value="all">ทุกประเภท</SelectItem>
      {typeOptions.map(([value, label]) => (
        <SelectItem key={value} value={value}>
          {label}
        </SelectItem>
      ))}
    </>
  );
}

export function PriceOptions({ mode }: { mode: ListingMode }) {
  return (
    <>
      {priceRanges[mode].map((range) => (
        <SelectItem key={range.value} value={range.value}>
          {range.label}
        </SelectItem>
      ))}
    </>
  );
}

export const priceLabel = (mode: ListingMode) => (mode === "buy" ? "ราคาขาย" : "ค่าเช่าต่อเดือน");

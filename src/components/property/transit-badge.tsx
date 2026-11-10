import { cn } from "@/lib/utils";
import type { TransitLineId, TransitStation } from "@/types/property";

export const lineColor: Record<TransitLineId, string> = {
  "bts-sukhumvit": "bg-bts-sukhumvit",
  "bts-silom": "bg-bts-silom",
  "mrt-blue": "bg-mrt-blue",
};

export const lineSystem: Record<TransitLineId, "BTS" | "MRT"> = {
  "bts-sukhumvit": "BTS",
  "bts-silom": "BTS",
  "mrt-blue": "MRT",
};

function formatDistance(metres: number) {
  return metres >= 1000 ? `${(metres / 1000).toFixed(1)} กม.` : `${metres} ม.`;
}

interface TransitBadgeProps {
  station: TransitStation;
  distance?: number;
  className?: string;
}

/** Station code in the line's colour, the way platform signage shows it. */
export function TransitBadge({ station, distance, className }: TransitBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-slate", className)}>
      <span
        className={cn(
          "inline-flex h-5 min-w-8 items-center justify-center rounded-sm px-1 text-[11px] font-semibold tracking-wide text-white tabular-nums",
          lineColor[station.line],
        )}
      >
        {station.code}
      </span>
      <span>
        {lineSystem[station.line]} {station.name}
        {distance !== undefined && <span className="text-slate"> {formatDistance(distance)}</span>}
      </span>
    </span>
  );
}

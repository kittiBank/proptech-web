import { lineColor } from "@/components/property/transit-badge";
import { formatDistance } from "@/lib/geo";
import { lineColourName } from "@/lib/listing";
import { cn } from "@/lib/utils";
import type { NearbyStation } from "@/types/property";

/**
 * Nearby stations as compact tags: line colour, line name, station and walking
 * distance, e.g. "● BTS สายสีเขียวอ่อน · ทองหล่อ 450 ม."
 */
export function StationRoutes({ stations }: { stations: NearbyStation[] }) {
  if (stations.length === 0) {
    return <p className="text-[15px] text-slate">ไม่มีสถานีรถไฟฟ้าในระยะเดิน 2.5 กม.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {stations.map(({ station, distance }) => (
        <li
          key={station.code}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong bg-white pr-3.5 pl-1.5 text-sm text-ink"
        >
          <span
            className={cn(
              "inline-flex h-6 min-w-8 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white tabular-nums",
              lineColor[station.line],
            )}
          >
            {station.code}
          </span>
          <span className="text-slate">{lineColourName[station.line]}</span>
          <span className="font-medium">{station.name}</span>
          <span className="text-slate tabular-nums">{formatDistance(distance)}</span>
        </li>
      ))}
    </ul>
  );
}

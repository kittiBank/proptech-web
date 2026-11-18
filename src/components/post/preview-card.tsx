import { ImageIcon } from "lucide-react";
import { lineColor } from "@/components/property/transit-badge";
import { propertyTypeLabels } from "@/data/catalog";
import { formatListingPrice } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { DraftValues } from "@/types/api";
import type { NearbyStation } from "@/types/property";

/**
 * C1–C6 live preview: the listing as it will look in search results, filled
 * in as the poster types.
 */
export function ListingPreviewCard({
  values,
  station,
  status,
  className,
}: {
  values: DraftValues;
  /** First chosen station with its distance. */
  station?: NearbyStation;
  /** Badge over the photo, e.g. "รอตรวจสอบ" on the success page. */
  status?: string;
  className?: string;
}) {
  const cover = values.photos.find((p) => p.status === "ready" && !p.isFloorPlan);
  const deal = values.deal === "rent" ? "เช่า" : "ขาย";
  const price =
    values.deal === "rent"
      ? values.rentPrice && formatListingPrice(values.rentPrice, "rent")
      : values.price && formatListingPrice(values.price, "buy");
  const specs = [
    values.propertyType && propertyTypeLabels[values.propertyType],
    values.bedrooms !== undefined && (values.bedrooms === 0 ? "สตูดิโอ" : `${values.bedrooms} นอน`),
    values.bathrooms && `${values.bathrooms} น้ำ`,
    values.area && `${values.area} ${values.propertyType === "land" ? "ตร.ว." : "ตร.ม."}`,
    values.projectName,
  ].filter(Boolean);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-white", className)}>
      <div className="relative flex aspect-[4/3] items-center justify-center bg-violet-50 text-[13px] text-[#7A6BB5]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- user upload preview (data URL), not an optimisable asset
          <img src={cover.url} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1.5">
            <ImageIcon className="size-6" aria-hidden="true" />
            ยังไม่มีรูป
          </span>
        )}
        <span
          className={cn(
            "absolute top-2.5 left-2.5 inline-flex h-[22px] items-center rounded-sm px-2 text-xs font-semibold text-white",
            values.deal === "rent" ? "bg-tag-rent" : "bg-tag-sale",
          )}
        >
          {values.deal === "both" ? "ขาย/เช่า" : deal}
        </span>
        {status && (
          <span className="absolute top-2.5 right-2.5 inline-flex h-[22px] items-center rounded-sm bg-warning-soft px-2 text-xs font-semibold text-warning">
            {status}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <p className={cn("text-xl font-semibold tabular-nums", price ? "text-ink" : "text-slate")}>
          {price || "฿ ราคา"}
        </p>
        <p className={cn("line-clamp-2 font-semibold", values.title ? "text-ink" : "text-slate")}>
          {values.title || "หัวข้อประกาศ"}
        </p>
        <p className="text-sm text-slate">{specs.length ? specs.join("  ") : "ประเภททรัพย์"}</p>
        {station && (
          <p className="mt-1 flex items-center gap-2 text-sm text-slate">
            <span
              className={cn(
                "inline-flex h-5 min-w-8 items-center justify-center rounded-sm px-1 text-[11px] font-semibold text-white",
                lineColor[station.station.line],
              )}
            >
              {station.station.code}
            </span>
            {station.station.name} {formatDistance(station.distance)}
          </p>
        )}
      </div>
    </div>
  );
}

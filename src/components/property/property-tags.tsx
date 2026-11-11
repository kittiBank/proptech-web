import { propertyTypeLabels } from "@/data/catalog";
import { cn } from "@/lib/utils";
import type { ListingMode, PropertyType } from "@/types/property";

/** Solid tags for the deal type, so sale vs rent reads at a glance. White text passes AA on both. */
const modeTag: Record<ListingMode, { label: string; className: string }> = {
  buy: { label: "ขาย", className: "bg-rose-600 text-white" },
  rent: { label: "เช่า", className: "bg-sky-700 text-white" },
};

/** Soft tags per property type; each -800 text on its -50 ground passes AA. */
const typeTag: Record<PropertyType, string> = {
  condo: "bg-violet-50 text-violet-700 ring-violet-200",
  house: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  townhouse: "bg-teal-50 text-teal-800 ring-teal-200",
  land: "bg-lime-50 text-lime-800 ring-lime-200",
  commercial: "bg-orange-50 text-orange-800 ring-orange-200",
};

const tagBase = "inline-flex h-6 items-center rounded-sm px-2 text-[13px] leading-none font-medium";

export function PropertyTags({ mode, type, className }: { mode: ListingMode; type: PropertyType; className?: string }) {
  return (
    <ul aria-label="ประเภทประกาศ" className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <li className={cn(tagBase, "ring-1 ring-inset", typeTag[type])}>{propertyTypeLabels[type]}</li>
      <li className={cn(tagBase, modeTag[mode].className)}>{modeTag[mode].label}</li>
    </ul>
  );
}

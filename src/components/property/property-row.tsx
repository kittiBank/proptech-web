import Link from "next/link";
import { routes } from "@/data/navigation";
import { formatListingPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Property } from "@/types/property";
import { PropertyPhoto } from "./property-photo";
import { modeTag } from "./property-tags";
import { TransitBadge } from "./transit-badge";

interface PropertyRowProps {
  property: Property;
  /** Extra content on the right, e.g. a remove button (favorites) or a status (admin). */
  aside?: React.ReactNode;
  className?: string;
}

/**
 * Compact listing row (handoff `PropertyCard compact`): 108×84 thumbnail,
 * deal tag, title, price and station. Used in phone lists (A9), chat and admin.
 * The title link is stretched over the row.
 */
export function PropertyRow({ property, aside, className }: PropertyRowProps) {
  const tag = modeTag[property.mode];
  return (
    <article className={cn("group relative flex gap-3 py-3", className)}>
      <PropertyPhoto image={property.image} sizes="108px" className="h-[84px] w-[108px] shrink-0 rounded-md" />
      <div className="min-w-0 flex-1">
        <span className={cn("inline-flex h-5 items-center rounded-sm px-1.5 text-[11px] font-medium", tag.className)}>
          {tag.label}
        </span>
        <h3 className="mt-1 line-clamp-2 text-sm leading-snug font-semibold text-ink group-hover:text-brand-strong">
          <Link
            href={routes.property(property.slug)}
            className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-md after:focus-visible:outline-2 after:focus-visible:outline-brand"
          >
            {property.title}
          </Link>
        </h3>
        <p className="font-semibold text-ink tabular-nums">{formatListingPrice(property.price, property.mode)}</p>
        {property.station && (
          <TransitBadge station={property.station} distance={property.stationDistance} className="mt-0.5 text-xs" />
        )}
      </div>
      {aside && <div className="relative z-[1] shrink-0">{aside}</div>}
    </article>
  );
}

import Link from "next/link";
import { BadgeCheck, Bath, BedDouble, Maximize2, Pin, Trees } from "lucide-react";
import { propertyTypeLabels } from "@/data/catalog";
import { routes } from "@/data/navigation";
import { formatListingPrice, formatNumber, formatRelativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Property } from "@/types/property";
import { FavoriteButton } from "./favorite-button";
import { PropertyPhoto } from "./property-photo";
import { TransitBadge } from "./transit-badge";

interface PropertyCardProps {
  property: Property;
  sizes?: string;
  priority?: boolean;
  /** `lead` = the large featured listing. */
  variant?: "default" | "lead" | "compact";
  className?: string;
}

export function PropertySpecs({ property, className }: { property: Property; className?: string }) {
  const showRooms = property.type !== "land" && property.type !== "commercial";
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate", className)}>
      {showRooms && (
        <li className="inline-flex items-center gap-1.5">
          <BedDouble className="size-4" aria-hidden="true" />
          {property.bedrooms === 0 ? "สตูดิโอ" : `${property.bedrooms} ห้องนอน`}
        </li>
      )}
      {property.bathrooms > 0 && (
        <li className="inline-flex items-center gap-1.5">
          <Bath className="size-4" aria-hidden="true" />
          {property.bathrooms} ห้องน้ำ
        </li>
      )}
      {property.type === "land" && property.landSize ? (
        <li className="inline-flex items-center gap-1.5">
          <Trees className="size-4" aria-hidden="true" />
          {formatNumber(property.landSize)} ตร.ว.
        </li>
      ) : (
        <li className="inline-flex items-center gap-1.5">
          <Maximize2 className="size-4" aria-hidden="true" />
          {formatNumber(property.area)} ตร.ม.
        </li>
      )}
    </ul>
  );
}

export function PropertyCard({ property, sizes, priority, variant = "default", className }: PropertyCardProps) {
  const isLead = variant === "lead";
  const href = routes.property(property.slug);

  return (
    <article
      className={cn(
        "group relative flex flex-col",
        variant === "compact" && "lg:grid lg:grid-cols-[46%_1fr] lg:gap-6",
        className,
      )}
    >
      <div className="relative">
        <PropertyPhoto
          image={property.image}
          sizes={sizes ?? "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"}
          priority={priority}
          className={cn(
            "rounded-md",
            isLead ? "aspect-[4/3] lg:aspect-[3/2]" : variant === "compact" ? "aspect-[16/10] lg:aspect-[4/5]" : "aspect-[4/3]",
          )}
        />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {property.isPinned && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-brand px-2 py-1 text-xs font-medium text-white">
              <Pin className="size-3.5 fill-white" aria-hidden="true" />
              ปักหมุด
            </span>
          )}
          <span className="rounded-sm bg-ink px-2 py-1 text-xs font-medium text-white">
            {property.mode === "buy" ? "ขาย" : "เช่า"}
          </span>
          {property.isVerified && !property.isPinned && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-white px-2 py-1 text-xs font-medium text-ink">
              <BadgeCheck className="size-3.5 text-brand" aria-hidden="true" />
              ตรวจสอบแล้ว
            </span>
          )}
        </div>
        <FavoriteButton
          propertyId={property.id}
          propertyTitle={property.title}
          className="absolute top-2 right-2 z-10"
        />
      </div>

      <div className={cn("flex flex-1 flex-col pt-4", isLead ? "gap-2.5" : "gap-2", variant === "compact" && "lg:justify-center lg:pt-0")}>
        <p
          className={cn(
            "font-semibold tracking-tight text-ink tabular-nums",
            isLead ? "text-[28px] leading-none sm:text-[32px]" : "text-xl leading-none",
          )}
        >
          {formatListingPrice(property.price, property.mode)}
        </p>
        <h3 className={cn("text-ink", isLead ? "text-lg leading-snug font-medium" : "line-clamp-2 text-[15px] leading-snug")}>
          {/* Stretched link: the whole card is clickable, the favourite button sits above it. */}
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-brand focus-visible:after:rounded-md">
            {property.title}
          </Link>
        </h3>
        <p className="text-sm text-slate">
          {[propertyTypeLabels[property.type], property.projectName, property.district].filter(Boolean).join(", ")}
        </p>
        <PropertySpecs property={property} />
        {property.station && (
          <TransitBadge station={property.station} distance={property.stationDistance} className="mt-0.5" />
        )}
        {variant === "default" && <span aria-hidden="true" className="h-1" />}
        {variant === "default" && (
          <p className="mt-auto flex flex-wrap gap-x-3 border-t border-line pt-3 text-[13px] text-slate">
            <span>{property.agent.kind === "owner" ? "เจ้าของขายเอง" : "นายหน้า"}</span>
            <span>ลงประกาศ {formatRelativeDays(property.postedAt)}</span>
          </p>
        )}
        {isLead && property.highlight && (
          <p className="mt-1 border-t border-line pt-3 text-[15px] text-ink">{property.highlight}</p>
        )}
      </div>
    </article>
  );
}

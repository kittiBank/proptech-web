import Link from "next/link";
import { BadgeCheck, Bath, BedDouble, Eye, Maximize2, Navigation, Pin, Trees } from "lucide-react";
import { formatDistance } from "@/lib/geo";
import { routes } from "@/data/navigation";
import { formatListingPrice, formatNumber, formatRelativeDays } from "@/lib/format";
import { cardImageZoom, cardLink, cardTitle, interactiveCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Property } from "@/types/property";
import { FavoriteButton } from "./favorite-button";
import { PropertyGallery } from "./property-gallery";
import { PropertyTags } from "./property-tags";
import { TransitBadge } from "./transit-badge";

interface PropertyCardProps {
  property: Property;
  sizes?: string;
  priority?: boolean;
  /** Metres from the listing the visitor is viewing; shown on "nearby" cards. */
  distanceFromHere?: number;
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

export function PropertyCard({ property, sizes, priority, distanceFromHere, className }: PropertyCardProps) {
  const href = routes.property(property.slug);
  const gallery = property.gallery?.length ? property.gallery : [property.image];

  return (
    <article className={cn(interactiveCard, className)}>
      <div className="relative">
        <PropertyGallery
          images={gallery}
          href={href}
          sizes={sizes ?? "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"}
          priority={priority}
          imageClassName={cardImageZoom}
          className="aspect-[4/3]"
        />
        <div className="pointer-events-none absolute top-3 left-3 z-[2] flex gap-1.5">
          {property.isPinned && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-brand px-2 py-1 text-xs font-medium text-white">
              <Pin className="size-3.5 fill-white" aria-hidden="true" />
              ปักหมุด
            </span>
          )}
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

      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <PropertyTags mode={property.mode} type={property.type} />
        <h3 className={cn("line-clamp-2 text-lg leading-snug font-semibold text-ink", cardTitle)}>
          {/* Stretched link: the whole card is clickable; gallery and favourite sit above it. */}
          <Link href={href} data-card-link className={cardLink}>
            {property.title}
          </Link>
        </h3>
        <p className="text-[22px] leading-none font-semibold tracking-tight text-ink tabular-nums">
          {formatListingPrice(property.price, property.mode)}
        </p>
        <p className="text-sm text-slate">{[property.projectName, property.district].filter(Boolean).join(", ")}</p>
        {distanceFromHere !== undefined && (
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong">
            <Navigation className="size-3.5" aria-hidden="true" />
            ห่างจากประกาศนี้ {formatDistance(distanceFromHere)}
          </p>
        )}
        <PropertySpecs property={property} />
        {property.station && (
          <TransitBadge station={property.station} distance={property.stationDistance} className="mt-0.5" />
        )}
        <div className="mt-auto pt-1">
          <div className="flex items-center justify-between gap-3 border-t border-line pt-3 text-[13px] text-slate">
            <p className="flex flex-wrap gap-x-3">
              <span>{property.agent.kind === "owner" ? "เจ้าของขายเอง" : "นายหน้า"}</span>
              <span>ลงประกาศ {formatRelativeDays(property.postedAt)}</span>
            </p>
            {property.viewCount !== undefined && (
              <p className="inline-flex shrink-0 items-center gap-1 tabular-nums">
                <Eye className="size-4" aria-hidden="true" />
                <span className="sr-only">เข้าชม</span>
                {formatNumber(property.viewCount)}
                <span className="sr-only">ครั้ง</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { Container, SectionHeader } from "@/components/home/section-header";
import { PropertyCard } from "@/components/property/property-card";
import { CardGridSkeleton, QueryError } from "@/components/ui/query-state";
import { routes } from "@/data/navigation";
import { propertyQueries } from "@/lib/api/queries";
import type { PropertyDetail } from "@/types/property";

const NEARBY_LIMIT = 6;

/** Closest other listings, same deal type first. Hidden when there are none. */
export function NearbyListings({ property }: { property: PropertyDetail }) {
  const { data, isPending, isError, refetch, isFetching } = useQuery(
    propertyQueries.nearby(property.slug, NEARBY_LIMIT),
  );
  const listings = data?.data ?? [];
  if (!isPending && !isError && listings.length === 0) return null;

  const area = property.location.stations[0]?.station.name ?? property.district;

  return (
    <section aria-labelledby="nearby-title" className="border-t border-line bg-mist py-16 sm:py-20">
      <Container>
        <SectionHeader
          id="nearby-title"
          title="ประกาศใกล้เคียงที่คุณอาจสนใจ"
          description={`ในรัศมี 5 กม. จากประกาศนี้ ย่าน${area} เรียงจากใกล้ไปไกล`}
          action={{
            label: `ดูประกาศย่าน${area}ทั้งหมด`,
            href: routes.search({ mode: property.mode, station: property.location.stations[0]?.station.code }),
          }}
        />
        {isPending ? (
          <CardGridSkeleton count={3} columns={3} label="กำลังโหลดประกาศใกล้เคียง" className="mt-10" />
        ) : isError ? (
          <QueryError what="ประกาศใกล้เคียง" onRetry={() => refetch()} retrying={isFetching} className="mt-10" />
        ) : (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((p) => (
              <li key={p.id} className="flex">
                <PropertyCard property={p} distanceFromHere={p.distance} className="w-full" />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}

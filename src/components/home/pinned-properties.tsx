"use client";

import { useQuery } from "@tanstack/react-query";
import { Pin } from "lucide-react";
import { PropertyCard } from "@/components/property/property-card";
import { CardGridSkeleton, QueryError } from "@/components/ui/query-state";
import { routes } from "@/data/navigation";
import { propertyQueries } from "@/lib/api/queries";
import { Container, SectionHeader } from "./section-header";

const PINNED_LIMIT = 8;

/** Paid highlight placements: two rows, four per row on desktop. */
export function PinnedProperties() {
  const { data, isPending, isError, refetch, isFetching } = useQuery(
    propertyQueries.list({ pinned: true, limit: PINNED_LIMIT }),
  );
  const properties = data?.data ?? [];

  // No paid placements right now: leave the section out rather than show an empty band.
  if (!isPending && !isError && properties.length === 0) return null;

  return (
    <section aria-labelledby="pinned-title" className="bg-mist py-16 sm:py-20">
      <Container>
        <SectionHeader
          id="pinned-title"
          title="ประกาศไฮไลต์"
          description={
            <span className="inline-flex flex-wrap items-center gap-x-2">
              <Pin className="size-4 text-brand" aria-hidden="true" />
              ประกาศที่เจ้าของและนายหน้าปักหมุดไว้ ตรวจสอบเอกสารและภาพถ่ายแล้วทุกรายการ
            </span>
          }
          action={{ label: "ปักหมุดประกาศของคุณ", href: `${routes.postProperty}?plan=pin` }}
        />

        {isPending ? (
          <CardGridSkeleton count={PINNED_LIMIT} label="กำลังโหลดประกาศไฮไลต์" className="mt-10" />
        ) : isError ? (
          <QueryError what="ประกาศไฮไลต์" onRetry={() => refetch()} retrying={isFetching} className="mt-10" />
        ) : (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {properties.map((p, i) => (
              <li key={p.id} className="flex">
                <PropertyCard property={p} priority={i < 4} className="w-full" />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Check, Search } from "lucide-react";
import { Container } from "@/components/home/section-header";
import { PropertyCard } from "@/components/property/property-card";
import { PropertyPhoto } from "@/components/property/property-photo";
import { useSaveSearch } from "@/components/search/save-search-card";
import { Button } from "@/components/ui/button";
import { CardGridSkeleton, QueryError } from "@/components/ui/query-state";
import { routes } from "@/data/navigation";
import { api } from "@/lib/api/endpoints";
import { propertyQueries, queryKeys } from "@/lib/api/queries";
import { closedListingSummary, closureCopy, formatThaiDate } from "@/lib/listing";
import { defaultSearchState, type SearchState } from "@/lib/search-params";
import { useFavorites } from "@/providers/favorites-store";
import type { ListingClosure, PropertyDetail } from "@/types/property";

const SIMILAR_LIMIT = 4;

/** Alerts for new units in the same project, or else the same type near the same station. */
function alertSearch(p: PropertyDetail): { state: SearchState; label: string } {
  const station = p.location.stations[0]?.station.code ?? p.station?.code;
  const base: SearchState = { ...defaultSearchState, mode: p.mode, type: p.type };
  if (p.projectName) {
    return { state: { ...base, keyword: p.projectName }, label: "แจ้งเตือนเมื่อมีห้องในโครงการนี้" };
  }
  return { state: { ...base, stations: station ? [station] : [] }, label: "แจ้งเตือนเมื่อมีประกาศใกล้เคียง" };
}

/** A closed listing comes off the visitor's favorites, with a note saying so (handoff §4). */
function useDropFromFavorites(propertyId: string) {
  const client = useQueryClient();
  const { isFavorite } = useFavorites();
  const saved = isFavorite(propertyId);
  const removal = useMutation({
    mutationFn: () => api.removeFavorite(propertyId),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.favorites }),
  });
  const started = useRef(false);
  const { mutate } = removal;
  useEffect(() => {
    if (!saved || started.current) return;
    started.current = true;
    mutate();
  }, [saved, mutate]);
  return removal.isSuccess;
}

function SimilarListings({ property }: { property: PropertyDetail }) {
  const { data, isPending, isError, refetch, isFetching } = useQuery(
    propertyQueries.nearby(property.slug, SIMILAR_LIMIT),
  );
  const listings = data?.data ?? [];
  if (!isPending && !isError && listings.length === 0) return null;
  const noun = property.type === "condo" ? "ห้อง" : "ทรัพย์";

  return (
    <section aria-labelledby="similar-title" className="mt-10 sm:mt-12">
      <h2 id="similar-title" className="mb-4 text-[22px] font-semibold tracking-[-0.01em] text-ink">
        {noun}คล้ายกันที่ยังว่าง
      </h2>
      {isPending ? (
        <CardGridSkeleton count={SIMILAR_LIMIT} columns={4} label={`กำลังโหลด${noun}คล้ายกัน`} />
      ) : isError ? (
        <QueryError what={`${noun}คล้ายกัน`} onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map((p) => (
            <li key={p.id} className="flex">
              <PropertyCard property={p} distanceFromHere={p.distance} className="w-full" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** D9: the listing was sold, rented or taken down. The page metadata sets `noindex` (see `proxy.ts` on 410). */
export function ClosedListing({ property, closure }: { property: PropertyDetail; closure: ListingClosure }) {
  const copy = closureCopy[closure.reason];
  const alert = alertSearch(property);
  const notify = useSaveSearch(alert.state, property.projectName ?? undefined);
  const droppedFromFavorites = useDropFromFavorites(property.id);
  const station = property.location.stations[0]?.station.code ?? property.station?.code;

  return (
    <Container className="pt-6 pb-16 sm:pt-8 sm:pb-20">
      <div className="grid grid-cols-1 items-center gap-6 rounded-xl border border-line bg-mist p-4 sm:p-6 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)] md:gap-8">
        <div className="relative">
          <PropertyPhoto
            image={property.image}
            sizes="(min-width: 768px) 420px, 100vw"
            className="aspect-[7/4] rounded-lg"
            imageClassName="grayscale-[.6]"
          />
          <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-ink/45 text-lg font-semibold text-white">
            {copy.label}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] text-slate">
            {property.code} · ปิดเมื่อ {formatThaiDate(closure.closedAt)}
          </p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.015em] text-ink sm:text-[28px]">{copy.title}</h1>
          <p className="mt-1.5 text-slate">{closedListingSummary(property)}</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {notify.saved ? (
              <Button variant="outline" disabled className="disabled:opacity-100">
                <Check aria-hidden="true" />
                เปิดการแจ้งเตือนแล้ว
              </Button>
            ) : (
              <Button onClick={notify.save} disabled={notify.pending}>
                <BellRing aria-hidden="true" />
                {notify.pending ? "กำลังบันทึก…" : alert.label}
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href={routes.search({ mode: property.mode, type: property.type, station })}>
                <Search aria-hidden="true" />
                ค้นหาใกล้เคียง
              </Link>
            </Button>
          </div>
          {notify.error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {notify.error}
            </p>
          )}
          {droppedFromFavorites && (
            <p role="status" className="mt-3 text-[13px] text-slate">
              ประกาศนี้ถูกนำออกจากรายการโปรดของคุณแล้ว
            </p>
          )}
        </div>
      </div>

      <SimilarListings property={property} />
    </Container>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  ExternalLink,
  GraduationCap,
  Hospital,
  MapPinned,
  Maximize2,
  Navigation,
  ShoppingBag,
  Trees,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { placeCategoryLabels } from "@/data/amenities";
import { stationsQuery } from "@/lib/api/queries";
import { formatDistance, googleMaps } from "@/lib/geo";
import type {
  GeoPoint,
  NearbyPlace,
  NearbyStation,
  PlaceCategory,
  PropertyDetail,
  TransitLineId,
} from "@/types/property";

const lineStroke: Record<TransitLineId, string> = {
  "bts-sukhumvit": "var(--color-bts-sukhumvit)",
  "bts-silom": "var(--color-bts-silom)",
  "mrt-blue": "var(--color-mrt-blue)",
};

const placeIcons: Record<PlaceCategory, typeof Hospital> = {
  shopping: ShoppingBag,
  hospital: Hospital,
  education: GraduationCap,
  park: Trees,
  office: Building2,
};

const W = 800;
const H = 420;

/** Equirectangular projection around `centre`, `span` metres across the width. */
function project(p: GeoPoint, centre: GeoPoint, span: number) {
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((centre.lat * Math.PI) / 180);
  return {
    x: W / 2 + (((p.lng - centre.lng) * mPerDegLng) / span) * W,
    y: H / 2 - (((p.lat - centre.lat) * mPerDegLat) / span) * W,
  };
}

/**
 * Schematic of the listing, its nearest station and the line through it,
 * drawn from real coordinates. No map tiles are loaded until the visitor
 * opens the full map.
 */
function SchematicMap({ point, nearest }: { point: GeoPoint; nearest?: NearbyStation }) {
  const { data } = useQuery(stationsQuery);
  const line = data?.data.find((l) => l.id === nearest?.station.line);
  const station = line?.stations.find((s) => s.stationCode === nearest?.station.code);
  const stationPoint = station?.point;

  const centre = stationPoint
    ? { lat: (point.lat + stationPoint.lat) / 2, lng: (point.lng + stationPoint.lng) / 2 }
    : point;
  const span = Math.max(1_400, (nearest?.distance ?? 600) * 2.4);
  const pin = project(point, centre, span);
  const stop = stationPoint ? project(stationPoint, centre, span) : undefined;
  const linePath = line?.stations
    .filter((s) => s.point)
    .map((s) => project(s.point!, centre, span))
    .map((xy, i) => `${i === 0 ? "M" : "L"}${xy.x.toFixed(1)},${xy.y.toFixed(1)}`)
    .join(" ");
  const stroke = line ? lineStroke[line.id] : "var(--color-line-strong)";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      role="img"
      aria-label="แผนผังตำแหน่งประกาศและสถานีที่ใกล้ที่สุด"
    >
      <defs>
        <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="var(--color-line)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="var(--color-mist)" />
      <rect width={W} height={H} fill="url(#map-grid)" />

      {linePath && (
        <path d={linePath} fill="none" stroke={stroke} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {line?.stations
        .filter((s) => s.point && s.stationCode !== station?.stationCode)
        .map((s) => {
          const xy = project(s.point!, centre, span);
          return <circle key={s.stationCode} cx={xy.x} cy={xy.y} r="7" fill="white" stroke={stroke} strokeWidth="4" />;
        })}

      {stop && (
        <>
          <line
            x1={pin.x}
            y1={pin.y}
            x2={stop.x}
            y2={stop.y}
            stroke="var(--color-brand)"
            strokeWidth="3"
            strokeDasharray="2 9"
            strokeLinecap="round"
          />
          <circle cx={stop.x} cy={stop.y} r="13" fill="white" stroke={stroke} strokeWidth="6" />
          <g transform={`translate(${stop.x + 20}, ${stop.y - 4})`}>
            <rect
              x="0"
              y="-18"
              rx="4"
              width={Math.max(96, (nearest!.station.name.length + 6) * 13)}
              height="30"
              fill="white"
              stroke="var(--color-line)"
            />
            <text x="10" y="2" fontSize="15" fontWeight="600" fill="var(--color-ink)">
              {nearest!.station.code} {nearest!.station.name}
            </text>
          </g>
        </>
      )}

      <g transform={`translate(${pin.x}, ${pin.y})`}>
        <circle r="34" fill="var(--color-brand)" opacity="0.14" />
        <path
          d="M0 4c-9-9-15-15-15-23a15 15 0 0 1 30 0c0 8-6 14-15 23z"
          transform="translate(0,-6)"
          fill="var(--color-brand)"
          stroke="white"
          strokeWidth="3"
        />
        <circle cy="-25" r="5.5" fill="white" />
      </g>
    </svg>
  );
}

function PlaceList({ places }: { places: NearbyPlace[] }) {
  if (places.length === 0) return null;
  return (
    <ul className="grid gap-x-8 sm:grid-cols-2">
      {[...places]
        .sort((a, b) => a.distance - b.distance)
        .map((place) => {
          const Icon = placeIcons[place.category];
          return (
            <li key={place.name} className="flex items-center gap-3 border-b border-line py-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-mist text-brand-strong">
                <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] text-ink">{place.name}</span>
                <span className="block text-[13px] text-slate">{placeCategoryLabels[place.category]}</span>
              </span>
              <span className="shrink-0 text-sm text-ink tabular-nums">{formatDistance(place.distance)}</span>
            </li>
          );
        })}
    </ul>
  );
}

export function LocationMap({ property }: { property: PropertyDetail }) {
  const [open, setOpen] = useState(false);
  const { point, address, stations, places } = property.location;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-lg border border-line">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group block aspect-[4/3] w-full sm:aspect-[800/420]"
          aria-label="เปิดแผนที่แบบเต็ม"
        >
          <SchematicMap point={point} nearest={stations[0]} />
          <span className="absolute bottom-3 left-3 inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-white transition-colors group-hover:bg-brand">
            <Maximize2 className="size-4" aria-hidden="true" />
            ดูแผนที่แบบเต็ม
          </span>
        </button>
        <a
          href={googleMaps.open(point)}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 right-3 inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-sm text-ink hover:border-ink"
        >
          Google Maps
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </div>

      <p className="flex items-start gap-2 text-[15px] text-ink">
        <MapPinned className="mt-0.5 size-[18px] shrink-0 text-brand" aria-hidden="true" />
        {address}
      </p>

      <PlaceList places={places} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:w-[min(1100px,calc(100vw-48px))]">
          <div className="border-b border-line px-5 py-4 pr-16">
            <DialogTitle className="text-lg font-semibold text-ink">แผนที่ตั้งทรัพย์</DialogTitle>
            <DialogDescription className="mt-0.5 text-sm text-slate">{address}</DialogDescription>
          </div>
          {open && (
            <iframe
              title={`แผนที่ ${property.title}`}
              src={googleMaps.embed(point)}
              className="h-[60dvh] w-full border-0 bg-mist"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4">
            <Button asChild variant="outline">
              <a href={googleMaps.open(point)} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" />
                เปิดใน Google Maps
              </a>
            </Button>
            <Button asChild>
              <a href={googleMaps.directions(point)} target="_blank" rel="noopener noreferrer">
                <Navigation aria-hidden="true" />
                นำทางมาที่นี่
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

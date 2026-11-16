"use client";

import { useEffect, useRef, useState } from "react";
import { LngLatBounds, Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPinOff } from "lucide-react";
import { formatPrice } from "@/lib/format";
import type { Property } from "@/types/property";

/** Free OpenStreetMap vector tiles, no API key. Swap for the production tile service later. */
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const BANGKOK: [number, number] = [100.535, 13.74];

// MapLibre finds its tile worker relative to its own file, which bundling breaks;
// this static reference makes the bundler emit the worker and gives MapLibre its URL.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

const markerClass =
  "rounded-full border border-white bg-brand px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap text-white tabular-nums shadow-[0_2px_6px_rgb(26_22_48/0.35)] transition-colors hover:z-20 hover:bg-brand-strong focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink data-[selected=true]:z-10 data-[selected=true]:bg-ink";

/** MapLibre needs WebGL; old devices or a disabled GPU do not have it. */
function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

interface ResultsMapProps {
  properties: Property[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * MapLibre map with a price marker per result on the current page. Loaded
 * only when the visitor switches to the map view (see `search-view.tsx`).
 */
export default function ResultsMap({ properties, selectedId, onSelect }: ResultsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<string, { marker: Marker; el: HTMLButtonElement }>());
  const onSelectRef = useRef(onSelect);
  // Rendered only in the browser (`ssr: false`), so the check can run during render.
  const [supported] = useState(supportsWebGL);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: BANGKOK,
      zoom: 11,
      // One-finger drag scrolls the page on phones; two fingers move the map.
      cooperativeGestures: true,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("click", () => onSelectRef.current(null));
    mapRef.current = map;
    const markers = markersRef.current;
    return () => {
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // One marker per listing with a position; fit the view around them.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;
    for (const { marker } of markers.values()) marker.remove();
    markers.clear();

    const plotted = properties.filter((p) => p.point);
    const bounds = new LngLatBounds();
    for (const property of plotted) {
      const { lat, lng } = property.point!;
      const el = document.createElement("button");
      el.type = "button";
      el.className = markerClass;
      el.textContent = `฿${formatPrice(property.price)}`;
      el.setAttribute("aria-label", `${property.title} ราคา ${formatPrice(property.price)} บาท`);
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current(property.id);
      });
      const marker = new Marker({ element: el, anchor: "bottom" }).setLngLat([lng, lat]).addTo(map);
      markers.set(property.id, { marker, el });
      bounds.extend([lng, lat]);
    }

    if (plotted.length > 0) {
      map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 0 });
    } else {
      map.jumpTo({ center: BANGKOK, zoom: 11 });
    }
  }, [properties]);

  // Highlight the selected marker and keep it in view.
  useEffect(() => {
    for (const [id, { el, marker }] of markersRef.current) {
      const selected = id === selectedId;
      el.setAttribute("data-selected", String(selected));
      el.setAttribute("aria-pressed", String(selected));
      if (selected && mapRef.current && !mapRef.current.getBounds().contains(marker.getLngLat())) {
        mapRef.current.easeTo({ center: marker.getLngLat() });
      }
    }
  }, [selectedId, properties]);

  if (!supported) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-mist p-8 text-center">
        <MapPinOff className="size-8 text-brand" aria-hidden="true" />
        <p className="text-[15px] text-slate">อุปกรณ์นี้แสดงแผนที่ไม่ได้ ลองเปลี่ยนเป็นมุมมองรายการ</p>
      </div>
    );
  }

  return <div ref={containerRef} role="region" aria-label="แผนที่ผลการค้นหา" className="h-full w-full" />;
}

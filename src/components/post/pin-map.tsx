"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPinOff } from "lucide-react";

/** Same free tiles as the search map. */
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const BANGKOK = { lat: 13.74, lng: 100.535 };

setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

interface PinMapProps {
  point?: { lat: number; lng: number };
  onChange: (point: { lat: number; lng: number }) => void;
}

/**
 * C2 `MapPinPicker`: drag the pin, or tap the map to drop it there. Loaded
 * only in the browser (see the location step's dynamic import).
 */
export default function PinMap({ point, onChange }: PinMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [supported] = useState(supportsWebGL);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!supported || !containerRef.current) return;
    const start = point ?? BANGKOK;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [start.lng, start.lat],
      zoom: point ? 16 : 11,
      cooperativeGestures: true,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    const el = document.createElement("div");
    el.className = "size-9 cursor-grab text-brand drop-shadow";
    el.setAttribute("aria-label", "หมุดตำแหน่งทรัพย์");
    el.innerHTML =
      '<svg viewBox="0 0 24 24" class="size-9" fill="currentColor" stroke="#fff" stroke-width="1.5"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg>';
    const marker = new Marker({ element: el, draggable: true, anchor: "bottom" }).setLngLat([start.lng, start.lat]);
    if (point) marker.addTo(map);
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLngLat();
      onChangeRef.current({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) });
    });
    map.on("click", (e) => {
      marker.setLngLat(e.lngLat).addTo(map);
      onChangeRef.current({ lat: +e.lngLat.lat.toFixed(6), lng: +e.lngLat.lng.toFixed(6) });
    });

    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // The map is created once; later point changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  // A point set elsewhere (project picked from the list) moves the pin and the view.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || !point) return;
    const current = marker.getLngLat();
    if (
      Math.abs(current.lat - point.lat) < 1e-6 &&
      Math.abs(current.lng - point.lng) < 1e-6 &&
      marker.getElement().isConnected
    )
      return;
    marker.setLngLat([point.lng, point.lat]).addTo(map);
    map.easeTo({ center: [point.lng, point.lat], zoom: Math.max(map.getZoom(), 16) });
  }, [point]);

  if (!supported) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate">
        <MapPinOff className="size-6 text-brand" aria-hidden="true" />
        เบราว์เซอร์นี้แสดงแผนที่ไม่ได้ เลือกโครงการจากรายการเพื่อใช้ตำแหน่งของโครงการแทน
      </div>
    );
  }
  return <div ref={containerRef} className="size-full" />;
}

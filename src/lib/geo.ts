import type { GeoPoint } from "@/types/property";

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Straight-line distance in metres. */
export function distanceBetween(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
}

/** Point `metres` away from `origin` in direction `bearingDeg` (0 = north). Fine at city scale. */
export function offsetPoint(origin: GeoPoint, metres: number, bearingDeg: number): GeoPoint {
  const bearing = toRad(bearingDeg);
  const dLat = (metres * Math.cos(bearing)) / 111_320;
  const dLng = (metres * Math.sin(bearing)) / (111_320 * Math.cos(toRad(origin.lat)));
  return { lat: +(origin.lat + dLat).toFixed(6), lng: +(origin.lng + dLng).toFixed(6) };
}

/** Walking minutes at an unhurried 80 m per minute. */
export function walkingMinutes(metres: number): number {
  return Math.max(1, Math.round(metres / 80));
}

/** 450 → "450 ม.", 1250 → "1.3 กม." */
export function formatDistance(metres: number): string {
  return metres >= 1000 ? `${(metres / 1000).toFixed(1)} กม.` : `${Math.round(metres / 10) * 10} ม.`;
}

export const googleMaps = {
  embed: (p: GeoPoint, zoom = 16) => `https://maps.google.com/maps?q=${p.lat},${p.lng}&z=${zoom}&output=embed`,
  open: (p: GeoPoint) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`,
  directions: (p: GeoPoint) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`,
};

import { areaRanges, bedroomOptions, priceRanges, propertyTypeLabels } from "@/data/catalog";
import { transitLines } from "@/data/locations";
import { findStation } from "@/lib/search";
import { updateSearchState, type SearchState } from "@/lib/search-params";

/**
 * D11 "no results": ways to loosen one filter at a time. Each suggestion is a
 * whole new search state; the page asks the API how many listings each would
 * return and only shows the ones that find something. A filter can offer a
 * small step and a broad one (nearby stations, then any station); the page
 * shows the first step of each filter that finds listings.
 */
export interface Relaxation {
  /** The filter it loosens; several suggestions can share one. */
  id: "stations" | "price" | "bedrooms" | "area" | "type" | "keyword";
  title: string;
  detail: string;
  state: SearchState;
}

/** Stations next to the chosen ones on the same line that are not chosen yet. */
export function neighbourStations(codes: string[]): string[] {
  const out: string[] = [];
  for (const code of codes) {
    for (const line of transitLines) {
      const i = line.stations.findIndex((s) => s.stationCode === code);
      if (i === -1) continue;
      for (const n of [line.stations[i - 1], line.stations[i + 1]]) {
        if (n && !codes.includes(n.stationCode) && !out.includes(n.stationCode)) out.push(n.stationCode);
      }
    }
  }
  return out;
}

const stationNames = (codes: string[]) => codes.map((c) => findStation(c)?.name ?? c);

/** Thai list: "ก", "ก และ ข", "ก, ข และ ค". */
const joinThai = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} และ ${items.at(-1)}`;

export function buildRelaxations(state: SearchState): Relaxation[] {
  const relax = (change: Partial<SearchState>) => updateSearchState(state, { ...change, page: 1 });
  const out: Relaxation[] = [];

  if (state.stations.length) {
    const near = neighbourStations(state.stations);
    if (near.length) {
      out.push({
        id: "stations",
        title: "เพิ่มสถานีใกล้เคียง",
        detail: `รวมสถานี${joinThai(stationNames(near))}`,
        state: relax({ stations: [...state.stations, ...near] }),
      });
    }
    out.push({
      id: "stations",
      title: "ไม่จำกัดสถานี",
      detail: "ดูทุกทำเลที่ตรงเงื่อนไขอื่น",
      state: relax({ stations: [] }),
    });
  }

  if (state.price !== "any") {
    const ranges = priceRanges[state.mode];
    const i = ranges.findIndex((r) => r.value === state.price);
    const higher = ranges[i + 1];
    if (higher) {
      out.push({
        id: "price",
        title: `ขยับงบเป็น ${higher.label}`,
        detail: "ไม่เปลี่ยนเงื่อนไขอื่น",
        state: relax({ price: higher.value }),
      });
    }
    out.push({
      id: "price",
      title: "ไม่จำกัดช่วงราคา",
      detail: "ไม่เปลี่ยนเงื่อนไขอื่น",
      state: relax({ price: "any" }),
    });
  }

  if (state.bedrooms !== "any") {
    const min = bedroomOptions.find((o) => o.value === state.bedrooms)?.min ?? 1;
    if (min > 1) {
      out.push({
        id: "bedrooms",
        title: `${min - 1} ห้องนอนขึ้นไป`,
        detail: "ห้องนอนเล็กมักใช้เป็นห้องทำงานได้",
        state: relax({ bedrooms: String(min - 1) }),
      });
    }
    out.push({
      id: "bedrooms",
      title: "ไม่จำกัดจำนวนห้องนอน",
      detail: "รวมห้องสตูดิโอ",
      state: relax({ bedrooms: "any" }),
    });
  }

  if (state.area !== "any") {
    const label = areaRanges.find((r) => r.value === state.area)?.label;
    out.push({
      id: "area",
      title: "ไม่จำกัดขนาดพื้นที่",
      detail: label ? `แทน ${label}` : "ไม่เปลี่ยนเงื่อนไขอื่น",
      state: relax({ area: "any" }),
    });
  }

  if (state.type !== "all") {
    out.push({
      id: "type",
      title: "ทุกประเภททรัพย์",
      detail: `ไม่จำกัดแค่${propertyTypeLabels[state.type]}`,
      state: relax({ type: "all" }),
    });
  }

  if (state.keyword.trim()) {
    out.push({
      id: "keyword",
      title: `ไม่ใช้คำค้น “${state.keyword.trim()}”`,
      detail: "ใช้เฉพาะตัวกรองที่เลือกไว้",
      state: relax({ keyword: "" }),
    });
  }

  return out;
}

/** The first step of each filter that finds listings, in filter order. `totals` lines up with `relaxations`. */
export function pickRelaxations<T extends Relaxation>(relaxations: T[], totals: number[], max: number) {
  const seen = new Set<Relaxation["id"]>();
  const picked: (T & { total: number })[] = [];
  relaxations.forEach((r, i) => {
    if (seen.has(r.id) || totals[i] <= 0) return;
    seen.add(r.id);
    picked.push({ ...r, total: totals[i] });
  });
  return picked.slice(0, max);
}

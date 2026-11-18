import { furnishingLabels } from "@/data/amenities";
import { formatListingPrice, formatNumber } from "@/lib/format";
import { walkingMinutes } from "@/lib/geo";
import { formatResponseTime, toBuddhistYear } from "@/lib/listing";
import type { PropertyDetail } from "@/types/property";

/**
 * Rows of the compare table (B12/B13). Each row knows which columns hold the
 * best value, so the table can tint them, and whether every column says the
 * same thing, so "show only differences" can hide it.
 */

export interface CompareRow {
  key: string;
  label: string;
  values: string[];
  /** Per column: holds the best value of the row. All false when the row has no ranking or no winner. */
  best: boolean[];
  /** Every column shows the same text. */
  same: boolean;
}

export interface CompareGroup {
  title: string;
  rows: CompareRow[];
}

type Rank = "low" | "high";

interface RowSpec {
  key: string;
  label: string;
  text: (p: PropertyDetail) => string | undefined;
  /** Number used to rank the row; `undefined` values never win. */
  score?: (p: PropertyDetail) => number | undefined;
  rank?: Rank;
  /** Only rank when every listing is for sale, or every listing is for rent. */
  sameModeOnly?: boolean;
}

const dash = "–";

function pricePerSqm(p: PropertyDetail) {
  return p.mode === "buy" && p.type !== "land" && p.area > 0 ? Math.round(p.price / p.area) : undefined;
}

const groups: { title: string; rows: RowSpec[] }[] = [
  {
    title: "ราคาและค่าใช้จ่าย",
    rows: [
      {
        key: "price",
        label: "ราคา",
        text: (p) => formatListingPrice(p.price, p.mode),
        score: (p) => p.price,
        rank: "low",
        sameModeOnly: true,
      },
      {
        key: "psm",
        label: "ราคาต่อ ตร.ม.",
        text: (p) => {
          const v = pricePerSqm(p);
          return v ? `฿${formatNumber(v)}` : undefined;
        },
        score: pricePerSqm,
        rank: "low",
      },
      {
        key: "fee",
        label: "ค่าส่วนกลาง",
        text: (p) => (p.commonFee ? `฿${formatNumber(p.commonFee)}/เดือน` : undefined),
        score: (p) => p.commonFee,
        rank: "low",
      },
    ],
  },
  {
    title: "ตัวห้อง",
    rows: [
      {
        key: "area",
        label: "พื้นที่ใช้สอย",
        text: (p) => `${formatNumber(p.area)} ตร.ม.`,
        score: (p) => p.area,
        rank: "high",
      },
      {
        key: "rooms",
        label: "ห้องนอน / ห้องน้ำ",
        text: (p) => (p.type === "land" ? undefined : `${p.bedrooms === 0 ? "สตูดิโอ" : p.bedrooms} / ${p.bathrooms}`),
      },
      {
        key: "floor",
        label: "ชั้น",
        text: (p) => (p.floor ? `${p.floor}${p.totalFloors ? ` จาก ${p.totalFloors}` : ""}` : undefined),
      },
      {
        key: "furnishing",
        label: "การตกแต่ง",
        text: (p) => (p.furnishing ? furnishingLabels[p.furnishing] : undefined),
      },
      {
        key: "year",
        label: "ปีที่สร้างเสร็จ",
        text: (p) => (p.yearBuilt ? `พ.ศ. ${toBuddhistYear(p.yearBuilt)}` : undefined),
        score: (p) => p.yearBuilt,
        rank: "high",
      },
    ],
  },
  {
    title: "ทำเลและส่วนกลาง",
    rows: [
      {
        key: "station",
        label: "สถานีใกล้สุด",
        text: (p) => {
          const s = p.location.stations[0];
          return s ? `${s.station.code} ${s.station.name} เดิน ${walkingMinutes(s.distance)} นาที` : undefined;
        },
      },
      {
        key: "walk",
        label: "ระยะเดิน",
        text: (p) => {
          const d = p.location.stations[0]?.distance;
          return d === undefined ? undefined : d >= 1000 ? `${(d / 1000).toFixed(1)} กม.` : `${d} ม.`;
        },
        score: (p) => p.location.stations[0]?.distance,
        rank: "low",
      },
      {
        key: "pet",
        label: "เลี้ยงสัตว์ได้",
        text: (p) => (p.facilities.includes("pet") ? "ได้" : "ไม่ได้"),
        score: (p) => (p.facilities.includes("pet") ? 1 : 0),
        rank: "high",
      },
      {
        key: "poster",
        label: "ผู้ลงประกาศ",
        text: (p) =>
          `${p.poster.kind === "agent" ? "นายหน้า" : "เจ้าของ"} ตอบ${formatResponseTime(p.poster.responseMinutes)}`,
      },
    ],
  },
];

function bestColumns(spec: RowSpec, listings: PropertyDetail[]): boolean[] {
  const none = listings.map(() => false);
  if (!spec.score || !spec.rank || listings.length < 2) return none;
  if (spec.sameModeOnly && new Set(listings.map((p) => p.mode)).size > 1) return none;
  const scores = listings.map(spec.score);
  const known = scores.filter((s): s is number => s !== undefined);
  if (known.length < 2 || new Set(known).size === 1) return none;
  const target = spec.rank === "low" ? Math.min(...known) : Math.max(...known);
  return scores.map((s) => s === target);
}

export function buildCompareGroups(listings: PropertyDetail[]): CompareGroup[] {
  return groups.map((g) => ({
    title: g.title,
    rows: g.rows.map((spec) => {
      const values = listings.map((p) => spec.text(p) ?? dash);
      return {
        key: spec.key,
        label: spec.label,
        values,
        best: bestColumns(spec, listings),
        same: new Set(values).size <= 1,
      };
    }),
  }));
}

/** Groups with identical rows removed; groups left empty are dropped. */
export function onlyDifferences(groups: CompareGroup[]): CompareGroup[] {
  return groups.map((g) => ({ ...g, rows: g.rows.filter((r) => !r.same) })).filter((g) => g.rows.length > 0);
}

export function countSameRows(groups: CompareGroup[]): number {
  return groups.reduce((n, g) => n + g.rows.filter((r) => r.same).length, 0);
}

/** `?ids=a,b,c` → unique ids, at most `max`. */
export function parseCompareIds(raw: string | null, max: number): string[] {
  return [
    ...new Set(
      (raw ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ].slice(0, max);
}

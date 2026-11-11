import type { ListingMode, Property, PropertyType, TransitStation } from "@/types/property";
import { photosByType } from "./images";
import { transitLines } from "./locations";

/**
 * Deterministic mock feed of general listings (what owners and agents post),
 * so pagination has realistic volume. Same seed → same data on server and client.
 */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261110);
const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];
const between = (min: number, max: number) => min + rand() * (max - min);
const roundTo = (value: number, step: number) => Math.round(value / step) * step;

const districtByStation: Record<string, string> = {
  ari: "พญาไท",
  asok: "วัฒนา",
  "phrom-phong": "วัฒนา",
  thonglor: "วัฒนา",
  ekkamai: "วัฒนา",
  "on-nut": "พระโขนง",
  "sala-daeng": "บางรัก",
  "chong-nonsi": "สาทร",
  surasak: "สาทร",
  "saphan-taksin": "บางรัก",
  "huai-khwang": "ห้วยขวาง",
  rama9: "ห้วยขวาง",
  "asok-mrt": "คลองเตย",
  lumphini: "ปทุมวัน",
};

const stations = transitLines.flatMap((line) =>
  line.stations.map((s) => ({
    locationId: s.id,
    median: s.medianPricePerSqm,
    station: { line: line.id, code: s.stationCode, name: s.name } satisfies TransitStation,
  })),
);

const condoNames = [
  "ลอฟท์ไลน์",
  "เดอะ ฮาร์เบอร์",
  "นอร์ธวิว",
  "ซิตี้ เฮเว่น",
  "แกรนด์ เรสซิเดนซ์",
  "ไลฟ์ สเปซ",
  "อาร์ทิซาน",
  "เดอะ เนสท์",
];
const agents = [
  { name: "ณัฐชา ประเสริฐวงศ์", kind: "agent" },
  { name: "ธนพล เจริญรัตน์", kind: "owner" },
  { name: "สุภาพร แก้วมณี", kind: "owner" },
  { name: "กิตติพัฒน์ ศรีสุข", kind: "agent" },
  { name: "ปวีณา อินทรสุวรรณ", kind: "owner" },
  { name: "อนันต์ ทองดี", kind: "agent" },
  { name: "ศิริพร มั่นคง", kind: "owner" },
  { name: "บ้านดี พร็อพเพอร์ตี้", kind: "agent" },
] as const;

function pickType(): PropertyType {
  const r = rand();
  if (r < 0.5) return "condo";
  if (r < 0.65) return "house";
  if (r < 0.8) return "townhouse";
  if (r < 0.88) return "land";
  return "commercial";
}

function buildListing(index: number): Property {
  const type = pickType();
  const mode: ListingMode = type === "land" || rand() < 0.6 ? "buy" : "rent";
  const loc = pick(stations);
  const nearStation = type === "condo" || type === "commercial" || rand() < 0.55;
  const district = districtByStation[loc.locationId] ?? "กรุงเทพฯ";

  let area = 0;
  let bedrooms = 0;
  let bathrooms = 0;
  let landSize: number | undefined;
  let price = 0;
  let title = "";
  let projectName: string | undefined;
  let floor: number | undefined;

  switch (type) {
    case "condo": {
      bedrooms = pick([0, 1, 1, 1, 2, 2, 3]);
      area = Math.round(
        bedrooms === 0
          ? between(24, 32)
          : bedrooms === 1
            ? between(30, 48)
            : bedrooms === 2
              ? between(55, 90)
              : between(100, 160),
      );
      bathrooms = Math.max(1, bedrooms === 3 ? 3 : bedrooms);
      floor = Math.round(between(4, 38));
      projectName = `${pick(condoNames)} ${loc.station.name}`;
      price =
        mode === "buy"
          ? roundTo(area * loc.median * between(0.78, 1.12), 10_000)
          : roundTo(area * between(420, 820), 500);
      title = `${bedrooms === 0 ? "สตูดิโอ" : `${bedrooms} ห้องนอน`} ${pick(["ชั้นสูง วิวเมือง", "ตกแต่งครบ พร้อมอยู่", "ห้องมุม ลมดี", "ใกล้รถไฟฟ้า", "ราคาดีในโครงการ", "เลี้ยงสัตว์ได้"])}`;
      break;
    }
    case "house": {
      bedrooms = pick([3, 3, 4, 4, 5]);
      bathrooms = bedrooms;
      landSize = Math.round(between(50, 140));
      area = Math.round(landSize * between(2.4, 3.2));
      price =
        mode === "buy" ? roundTo(between(5_500_000, 32_000_000), 100_000) : roundTo(between(35_000, 160_000), 5_000);
      title = `บ้านเดี่ยว ${bedrooms} ห้องนอน ${pick(["ในซอยเงียบ", "พร้อมสวนหน้าบ้าน", "รีโนเวทใหม่", "ในหมู่บ้านมีรปภ.", "จอดรถได้ 3 คัน"])}`;
      break;
    }
    case "townhouse": {
      bedrooms = pick([2, 3, 3, 4]);
      bathrooms = bedrooms;
      landSize = Math.round(between(17, 28));
      area = Math.round(between(110, 200));
      price = mode === "buy" ? roundTo(between(2_600_000, 9_500_000), 10_000) : roundTo(between(15_000, 48_000), 1_000);
      title = `ทาวน์โฮม ${pick(["2", "3"])} ชั้น ${pick(["หน้ากว้าง", "หลังมุม", "ใกล้ทางด่วน", "ตกแต่งใหม่", "เหมาะทำโฮมออฟฟิศ"])}`;
      break;
    }
    case "land": {
      landSize = Math.round(between(80, 800));
      area = landSize * 4;
      price = roundTo(landSize * between(60_000, 220_000), 100_000);
      title = `ที่ดินเปล่า ${landSize >= 400 ? `${Math.round(landSize / 400)} ไร่` : `${landSize} ตร.ว.`} ${pick(["ถมแล้ว", "ติดถนนใหญ่", "รูปแปลงสวย", "เหมาะสร้างบ้าน"])}`;
      break;
    }
    case "commercial": {
      area = Math.round(between(60, 400));
      bathrooms = Math.round(between(1, 4));
      landSize = rand() < 0.5 ? Math.round(between(16, 30)) : undefined;
      price =
        mode === "buy" ? roundTo(between(5_000_000, 42_000_000), 100_000) : roundTo(between(25_000, 220_000), 5_000);
      title = `${pick(["อาคารพาณิชย์ 4 ชั้น", "สำนักงานให้เช่า", "พื้นที่ร้านค้าชั้นล่าง", "โฮมออฟฟิศ"])} ${area} ตร.ม.`;
      break;
    }
  }

  const daysAgo = Math.floor(between(0, 40));
  const posted = new Date(Date.UTC(2026, 10, 10 - daysAgo));
  const id = `g-${2000 + index}`;

  return {
    id,
    slug: `listing-${2000 + index}`,
    title,
    projectName,
    mode,
    type,
    price,
    area,
    landSize,
    bedrooms,
    bathrooms,
    floor,
    district,
    locationId: loc.locationId,
    station: nearStation ? loc.station : undefined,
    stationDistance: nearStation ? roundTo(between(120, 1200), 10) : undefined,
    image: pick(photosByType[type]),
    postedAt: posted.toISOString().slice(0, 10),
    isVerified: rand() < 0.7,
    agent: { ...pick(agents) },
  };
}

export const generatedListings: Property[] = Array.from({ length: 112 }, (_, i) => buildListing(i));

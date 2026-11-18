import { offsetPoint } from "@/lib/geo";
import { toBuddhistYear } from "@/lib/listing";
import type {
  GeoPoint,
  ListingMode,
  NewProject,
  ProjectDetail,
  ProjectMilestone,
  ProjectUnitType,
  Property,
} from "@/types/property";
import { projectFacilityPool } from "./amenities";
import { photosByType } from "./images";
import { placesByLocation } from "./places";
import { hash, locationIdForStation, stationPoint, stationsNear } from "./property-details";

/**
 * Builds the project page for a mock project. Everything is derived from the
 * project row, so a project always shows the same detail. Stand-in for the
 * columns the NestJS `projects` table will hold.
 */

/** Rough centres of suburbs that have no station on record. */
const districtCentres: Record<string, GeoPoint> = {
  บางกรวย: { lat: 13.8053, lng: 100.4726 },
  บางนา: { lat: 13.6681, lng: 100.6343 },
  ตลิ่งชัน: { lat: 13.7768, lng: 100.4563 },
  บางพลี: { lat: 13.6105, lng: 100.7068 },
  ปากเกร็ด: { lat: 13.9131, lng: 100.4987 },
};
const CITY_CENTRE: GeoPoint = { lat: 13.7367, lng: 100.5232 };

export function projectPoint(project: NewProject): GeoPoint {
  const seed = hash(project.id);
  const anchor = stationPoint(project.station?.code) ?? districtCentres[project.district.split(",")[0]] ?? CITY_CENTRE;
  return offsetPoint(anchor, project.stationDistance ?? 300 + (seed % 900), seed % 360);
}

const thaiMonthYear = new Intl.DateTimeFormat("th-TH", { month: "short", year: "numeric" });

function unitTypes(p: NewProject): ProjectUnitType[] {
  const { min, max } = p.sizeRange;
  const perSqm = p.startingPrice / (p.type === "condo" ? min : 140);
  // [name, bedrooms, usable area, price factor per area]
  const plans: [string, number, number, number][] =
    p.type === "condo"
      ? [
          ["1 ห้องนอน", 1, min, 1],
          ["1 ห้องนอน Plus", 1, Math.round(min * 1.3), 0.97],
          ["2 ห้องนอน", 2, Math.round((min + max) / 2), 0.99],
          [max >= 90 ? "Duplex 2 ห้องนอน" : "2 ห้องนอน Plus", 2, max, 1.03],
        ]
      : [
          ["แบบ A", 3, 140, 1],
          ["แบบ B", 3, 170, 0.98],
          ["แบบ C", 4, 210, 1.02],
        ];
  // Smaller plans sell slower, so more of them are left.
  const weights = plans.map((_, i) => plans.length - i);
  const total = weights.reduce((a, b) => a + b, 0);
  return plans.map(([name, bedrooms, area, factor], i) => ({
    id: `${p.id}-u${i + 1}`,
    name,
    bedrooms,
    area,
    price: i === 0 ? p.startingPrice : Math.round((perSqm * area * factor) / 10_000) * 10_000,
    unitsLeft: Math.max(1, Math.round((p.unitsLeft * weights[i]) / total)),
  }));
}

function milestones(p: NewProject): ProjectMilestone[] {
  const done = toBuddhistYear(p.completionYear);
  const steps = [
    {
      title: "เปิดจองรอบแรก",
      detail: `ขายไปแล้ว ${Math.round((1 - p.unitsLeft / p.units) * 100)}% ของยูนิตทั้งหมด`,
      date: thaiMonthYear.format(new Date(p.launchedAt)),
    },
    { title: "งานฐานรากและเสาเข็ม", detail: "เสาเข็ม ฐานราก และที่จอดรถชั้นใต้ดิน", date: `ไตรมาส 3 ${done - 2}` },
    {
      title: p.type === "condo" ? "งานโครงสร้างอาคาร" : "งานโครงสร้างบ้าน",
      detail: p.status === "under-construction" ? `คืบหน้ารวม ${p.progress ?? 0}%` : "โครงสร้างหลักและผนัง",
      date: `ไตรมาส 4 ${done - 1}`,
    },
    {
      title: "งานระบบและตกแต่งภายใน",
      detail: p.type === "condo" ? "ห้องชุด ส่วนกลาง และงานระบบ" : "งานระบบ ภูมิทัศน์ และสโมสร",
      date: `ไตรมาส 2 ${done}`,
    },
    { title: "ตรวจรับห้องและโอนกรรมสิทธิ์", detail: "นัดตรวจห้องก่อนโอน", date: `ไตรมาส 4 ${done}` },
  ];
  const progress = p.progress ?? 0;
  const current =
    p.status === "ready" ? steps.length : p.status === "pre-sale" ? 0 : progress < 25 ? 1 : progress < 70 ? 2 : 3;
  return steps.map((s, i) => ({
    ...s,
    state: i < current ? "done" : i === current ? "current" : "upcoming",
    date: i === current && p.status === "under-construction" ? "กำลังดำเนินการ" : s.date,
  }));
}

function describe(p: NewProject, floors: number, landRai: number): string {
  const what =
    p.type === "condo"
      ? `คอนโดมิเนียม ${floors} ชั้น บนที่ดิน ${landRai} ไร่`
      : `${p.type === "house" ? "บ้านเดี่ยว" : "ทาวน์โฮม"} ${p.units} หลัง บนที่ดิน ${landRai} ไร่`;
  const near = p.station
    ? `เดินถึงสถานี${p.station.name} ${p.stationDistance} เมตร`
    : "เข้าถึงถนนสายหลักและทางด่วนได้สะดวก";
  return [
    `${p.name} ${what} ย่าน${p.district.split(",")[0]} ${near}`,
    p.summary,
    p.type === "condo"
      ? "ทุกห้องมีระเบียงและเพดานสูง ส่วนกลางบนชั้นดาดฟ้าและชั้นสโมสร ที่จอดรถพร้อมที่ชาร์จรถไฟฟ้า"
      : "ทุกหลังมีที่จอดรถ 2 คัน สวนหน้าบ้าน และระบบรักษาความปลอดภัย 24 ชั่วโมง",
  ].join("\n\n");
}

export function buildProjectDetail(p: NewProject, listingCount: number): ProjectDetail {
  const seed = hash(p.id);
  const point = projectPoint(p);
  const floors = p.type === "condo" ? 8 + (seed % 41) : p.type === "house" ? 2 : 3;
  const landSize = p.type === "condo" ? 800 + (seed % 5) * 200 : Math.round((p.units * 60) / 100) * 100;
  const stated =
    p.station && p.stationDistance !== undefined ? { station: p.station, distance: p.stationDistance } : undefined;
  const gallery = [p.image, ...photosByType[p.type].filter((img) => img.src !== p.image.src).slice(0, 5)];
  const address = `${p.name}, ${p.district.replace(",", " ")}`;

  return {
    ...p,
    gallery,
    description: describe(p, floors, Math.round(landSize / 400)),
    address,
    developerProjects: 4 + (seed % 14),
    buildings: p.type === "condo" ? 1 + (seed % 2) : 0,
    floors,
    landSize,
    parkingRatio: p.type === "condo" ? 35 + (seed % 5) * 10 : 200,
    reservationFee: p.startingPrice >= 8_000_000 ? 100_000 : p.startingPrice >= 4_000_000 ? 50_000 : 25_000,
    promotion:
      p.status === "ready"
        ? { title: "พร้อมโอน ฟรีค่าโอน", detail: "ฟรีค่าธรรมเนียมการโอนและค่าส่วนกลาง 1 ปี" }
        : {
            title: p.status === "pre-sale" ? "ส่วนลดเปิดจองรอบแรก" : "ส่วนลดพิเศษเดือนนี้",
            detail: `ลดสูงสุด ฿${(Math.round((p.startingPrice * 0.045) / 10_000) * 10_000).toLocaleString("th-TH")} สำหรับผู้ลงทะเบียนก่อน 30 พ.ย. 2569`,
          },
    unitTypes: unitTypes(p),
    milestones: milestones(p),
    progressUpdatedAt: "2026-11-01",
    facilities: projectFacilityPool[p.type].filter((_, i) => (seed >> i) % 4 !== 0 || i < 4),
    salesPhone: `02-${String(100 + (seed % 900))}-${String(1000 + (seed % 9000))}`,
    location: {
      address,
      point,
      stations: stationsNear(point, stated),
      places: placesByLocation[locationIdForStation(p.station?.code) ?? ""] ?? [],
    },
    listingCount,
  };
}

/**
 * Resale and rental listings inside each project, posted by owners and agents.
 * They join the general listings feed so they show up in search too.
 */
export function buildProjectListings(projects: NewProject[]): Property[] {
  return projects.flatMap((p) => {
    const seed = hash(p.slug);
    // Pre-sale projects have no finished units to resell yet, only down-payment transfers.
    const count = p.status === "pre-sale" ? 1 : 2 + (seed % 3);
    const plans = unitTypes(p);
    return Array.from({ length: count }, (_, i): Property => {
      const plan = plans[(seed + i) % plans.length];
      const mode: ListingMode = p.status === "ready" && i % 2 === 1 ? "rent" : "buy";
      const price =
        mode === "rent"
          ? Math.round((plan.area * (450 + (seed % 300))) / 500) * 500
          : Math.round((plan.price * (1.02 + ((seed >> i) % 8) / 100)) / 10_000) * 10_000;
      const floor = p.type === "condo" ? 5 + ((seed >> (i + 2)) % 30) : undefined;
      const images = photosByType[p.type];
      return {
        id: `pl-${p.id}-${i + 1}`,
        slug: `${p.slug}-listing-${i + 1}`,
        title:
          p.type === "condo"
            ? `${plan.name} ชั้น ${floor} ${mode === "rent" ? "พร้อมเข้าอยู่" : p.status === "ready" ? "ห้องสวย" : "ขายดาวน์"}`
            : `${p.type === "house" ? "บ้านเดี่ยว" : "ทาวน์โฮม"} ${plan.name} ${plan.bedrooms} ห้องนอน`,
        projectName: p.name,
        mode,
        type: p.type,
        price,
        area: plan.area,
        landSize: p.type === "condo" ? undefined : p.sizeRange.min + ((seed >> i) % 10),
        bedrooms: plan.bedrooms,
        bathrooms: plan.bedrooms,
        floor,
        district: p.district.split(",")[0],
        locationId: locationIdForStation(p.station?.code) ?? "",
        station: p.station,
        stationDistance: p.stationDistance,
        image: images[(seed + i) % images.length],
        postedAt: new Date(Date.UTC(2026, 10, 9 - ((seed >> i) % 30))).toISOString().slice(0, 10),
        isVerified: i % 3 !== 2,
        agent:
          i % 2 === 0 ? { name: "บ้านดี พร็อพเพอร์ตี้", kind: "agent" } : { name: "สุภาพร แก้วมณี", kind: "owner" },
      };
    });
  });
}

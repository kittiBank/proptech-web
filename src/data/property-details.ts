import { offsetPoint, distanceBetween } from "@/lib/geo";
import type {
  Furnishing,
  GeoPoint,
  LocationArea,
  NearbyStation,
  Property,
  PropertyDetail,
  TransitLine,
} from "@/types/property";
import { facilityPoolByType, featurePoolByType } from "./amenities";
import { propertyTypeLabels } from "./catalog";
import { transitLines } from "./locations";
import { placesByLocation } from "./places";
import { findPoster } from "./posters";

/**
 * Builds the listing-page detail for a mock listing. Everything is derived
 * from the listing id, so a listing always shows the same detail. Stand-in
 * for the columns the NestJS `properties` table will hold.
 */

const stationsWithLine: { line: TransitLine; area: LocationArea }[] = transitLines.flatMap((line) =>
  line.stations.map((area) => ({ line, area })),
);

/** Central Bangkok, for listings whose area has no station on record. */
const CITY_CENTRE: GeoPoint = { lat: 13.7367, lng: 100.5232 };

export function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function pickSome<T>(pool: T[], seed: number, min: number): T[] {
  if (pool.length === 0) return [];
  const count = Math.min(pool.length, min + (seed % Math.max(1, pool.length - min + 1)));
  return pool.filter((_, i) => (seed >> i) % 3 !== 0 || i < min).slice(0, count);
}

/** Where the listing is: near its station when it has one, otherwise near its area's station. */
export function listingPoint(property: Property): GeoPoint {
  const seed = hash(property.id);
  const anchor =
    stationsWithLine.find((s) => s.area.stationCode === property.station?.code)?.area.point ??
    stationsWithLine.find((s) => s.area.id === property.locationId)?.area.point ??
    CITY_CENTRE;
  const metres = property.stationDistance ?? 400 + (seed % 1400);
  return offsetPoint(anchor, metres, seed % 360);
}

function nearbyStations(point: GeoPoint, property: Property): NearbyStation[] {
  const ranked = stationsWithLine
    .filter((s) => s.area.point)
    .map(({ line, area }) => ({
      station: { line: line.id, code: area.stationCode, name: area.name },
      // Walking routes are longer than the straight line.
      distance: Math.round(distanceBetween(point, area.point!) * 1.25),
    }))
    .sort((a, b) => a.distance - b.distance);

  // The poster's stated station and distance always come first.
  if (property.station && property.stationDistance !== undefined) {
    const stated = { station: property.station, distance: property.stationDistance };
    const rest = ranked.filter((s) => s.station.code !== property.station!.code);
    return [stated, ...rest].filter((s) => s.distance <= 2500).slice(0, 3);
  }
  return ranked.filter((s) => s.distance <= 2500).slice(0, 3);
}

const facings = ["ทิศเหนือ", "ทิศใต้", "ทิศตะวันออก", "ทิศตะวันตก", "ทิศตะวันออกเฉียงเหนือ"];
const furnishings: Furnishing[] = ["fully", "fully", "partly", "unfurnished"];

function describe(property: Property, furnishing: Furnishing | undefined): string {
  const type = propertyTypeLabels[property.type];
  const where = property.projectName ? `ในโครงการ${property.projectName}` : `ย่าน${property.district}`;
  const near = property.station
    ? `เดินถึงสถานี${property.station.name}ประมาณ ${property.stationDistance ?? 500} เมตร`
    : "เดินทางสะดวก เข้าถึงถนนหลักได้หลายเส้นทาง";
  const rooms =
    property.type === "land" || property.type === "commercial"
      ? `พื้นที่ ${property.area} ตร.ม.`
      : `${property.bedrooms === 0 ? "ห้องสตูดิโอ" : `${property.bedrooms} ห้องนอน`} ${property.bathrooms} ห้องน้ำ พื้นที่ใช้สอย ${property.area} ตร.ม.`;
  const finish =
    furnishing === "fully"
      ? "ตกแต่งครบ มีเฟอร์นิเจอร์และเครื่องใช้ไฟฟ้า หิ้วกระเป๋าเข้าอยู่ได้ทันที"
      : furnishing === "partly"
        ? "มีเฟอร์นิเจอร์บิวท์อินและเครื่องปรับอากาศ เพิ่มของใช้ตามสไตล์ของคุณได้"
        : "ห้องเปล่า เหมาะกับคนที่อยากออกแบบตกแต่งเอง";
  const deal =
    property.mode === "rent"
      ? "สัญญาเช่าขั้นต่ำ 1 ปี นัดดูห้องได้ทุกวัน แจ้งล่วงหน้า 1 วัน"
      : "ราคาต่อรองได้สำหรับผู้ซื้อที่พร้อมโอน ช่วยประสานงานยื่นกู้ธนาคาร";

  return [
    `${property.title} ${type}${where} ${near}`,
    `${rooms} ${finish}`,
    property.highlight
      ? `จุดเด่น: ${property.highlight}`
      : "ทำเลเงียบสงบ ใกล้ร้านอาหาร ซูเปอร์มาร์เก็ต และร้านสะดวกซื้อ",
    deal,
  ].join("\n\n");
}

export function buildPropertyDetail(property: Property): PropertyDetail {
  const seed = hash(property.id);
  const point = listingPoint(property);
  const hasRooms = property.type !== "land";
  const furnishing = hasRooms && property.type !== "commercial" ? furnishings[seed % furnishings.length] : undefined;
  const features = furnishing === "unfurnished" ? ["aircon"] : pickSome(featurePoolByType[property.type], seed, 3);
  const facilities = pickSome(facilityPoolByType[property.type], seed >> 3, 3);

  const highlights = [
    property.highlight,
    facilities.includes("pet") ? "เลี้ยงสัตว์ได้" : undefined,
    property.floor && property.floor >= 20 ? "ชั้นสูง วิวเมือง" : undefined,
    furnishing === "fully" ? "พร้อมอยู่" : undefined,
    seed % 4 === 0 && property.type === "condo" ? "ห้องมุม" : undefined,
  ].filter((h): h is string => Boolean(h));

  const posted = new Date(property.postedAt);
  const updated = new Date(posted.getTime() + (seed % 4) * 86_400_000);

  return {
    ...property,
    code: `PH-${property.id.replace(/\D/g, "")}`,
    description: describe(property, furnishing),
    updatedAt: updated.toISOString().slice(0, 10),
    totalFloors:
      property.type === "condo"
        ? Math.max((property.floor ?? 8) + 2, 8 + (seed % 40))
        : property.type === "land"
          ? undefined
          : 2 + (seed % 2),
    parking: property.type === "land" ? 0 : property.type === "house" ? 2 + (seed % 2) : 1,
    furnishing,
    facing: hasRooms ? facings[seed % facings.length] : undefined,
    yearBuilt: hasRooms ? 2012 + (seed % 14) : undefined,
    commonFee: property.type === "condo" ? Math.round((property.area * (45 + (seed % 30))) / 10) * 10 : undefined,
    depositMonths: property.mode === "rent" ? 2 : undefined,
    advanceMonths: property.mode === "rent" ? 1 : undefined,
    minContractMonths: property.mode === "rent" ? 12 : undefined,
    features,
    facilities,
    highlights,
    location: {
      address: [
        property.projectName,
        `เขต${property.district.split(" ")[0]}`,
        property.district.includes("นนทบุรี") ? "นนทบุรี" : "กรุงเทพมหานคร",
      ]
        .filter(Boolean)
        .join(", "),
      point,
      stations: nearbyStations(point, property),
      places: placesByLocation[property.locationId] ?? [],
    },
    poster: findPoster(property.agent, seed),
  };
}

import type { ListingMode, PriceRangeOption, PropertyCategory, PropertyType, TransitStation } from "@/types/property";

export const propertyTypeLabels: Record<PropertyType, string> = {
  condo: "คอนโด",
  house: "บ้านเดี่ยว",
  townhouse: "ทาวน์โฮม",
  land: "ที่ดิน",
  commercial: "อาคารพาณิชย์",
};

export const propertyCategories: PropertyCategory[] = [
  { type: "condo", label: "คอนโด", description: "ใกล้รถไฟฟ้า พร้อมส่วนกลาง", listingCount: 48_216 },
  { type: "house", label: "บ้านเดี่ยว", description: "พื้นที่สำหรับครอบครัว", listingCount: 21_904 },
  { type: "townhouse", label: "ทาวน์โฮม", description: "คุ้มค่าในเมือง", listingCount: 14_377 },
  { type: "land", label: "ที่ดิน", description: "ลงทุนหรือสร้างบ้านเอง", listingCount: 6_852 },
  { type: "commercial", label: "อาคารพาณิชย์", description: "ออฟฟิศ ร้านค้า โกดัง", listingCount: 5_119 },
];

export const priceRanges: Record<ListingMode, PriceRangeOption[]> = {
  buy: [
    { value: "any", label: "ทุกช่วงราคา" },
    { value: "0-3m", label: "ไม่เกิน 3 ล้าน", max: 3_000_000 },
    { value: "3-5m", label: "3 – 5 ล้าน", min: 3_000_000, max: 5_000_000 },
    { value: "5-10m", label: "5 – 10 ล้าน", min: 5_000_000, max: 10_000_000 },
    { value: "10-20m", label: "10 – 20 ล้าน", min: 10_000_000, max: 20_000_000 },
    { value: "20m+", label: "มากกว่า 20 ล้าน", min: 20_000_000 },
  ],
  rent: [
    { value: "any", label: "ทุกช่วงราคา" },
    { value: "0-15k", label: "ไม่เกิน 15,000/เดือน", max: 15_000 },
    { value: "15-30k", label: "15,000 – 30,000/เดือน", min: 15_000, max: 30_000 },
    { value: "30-60k", label: "30,000 – 60,000/เดือน", min: 30_000, max: 60_000 },
    { value: "60k+", label: "มากกว่า 60,000/เดือน", min: 60_000 },
  ],
};

export const popularSearches: {
  label: string;
  mode: ListingMode;
  keyword?: string;
  station?: string;
  type?: PropertyType;
}[] = [
  { label: "คอนโดใกล้ BTS อโศก", mode: "buy", station: "E4", type: "condo" },
  { label: "เช่าใกล้ BTS อารีย์", mode: "rent", station: "N5" },
  { label: "เช่าใกล้ MRT พระราม 9", mode: "rent", station: "BL20" },
  { label: "บ้านเดี่ยวขาย", mode: "buy", type: "house" },
];

/** Busiest stations, offered as starting points on the 404 page (D8). */
export const popularStations: TransitStation[] = [
  { line: "bts-sukhumvit", code: "E5", name: "พร้อมพงษ์" },
  { line: "bts-sukhumvit", code: "E6", name: "ทองหล่อ" },
  { line: "bts-sukhumvit", code: "N8", name: "หมอชิต" },
  { line: "mrt-blue", code: "BL22", name: "สุขุมวิท" },
  { line: "bts-silom", code: "S2", name: "ศาลาแดง" },
];

/** Usable-area brackets in square metres, for the search page. */
export const areaRanges: { value: string; label: string; min?: number; max?: number }[] = [
  { value: "any", label: "ทุกขนาด" },
  { value: "0-35", label: "ไม่เกิน 35 ตร.ม.", max: 35 },
  { value: "35-60", label: "35 – 60 ตร.ม.", min: 35, max: 60 },
  { value: "60-100", label: "60 – 100 ตร.ม.", min: 60, max: 100 },
  { value: "100-200", label: "100 – 200 ตร.ม.", min: 100, max: 200 },
  { value: "200+", label: "มากกว่า 200 ตร.ม.", min: 200 },
];

/** Minimum bedrooms; "any" also includes studios and listings without rooms (land). */
export const bedroomOptions: { value: string; label: string; min?: number }[] = [
  { value: "any", label: "ทั้งหมด" },
  { value: "1", label: "1+", min: 1 },
  { value: "2", label: "2+", min: 2 },
  { value: "3", label: "3+", min: 3 },
  { value: "4", label: "4+", min: 4 },
];

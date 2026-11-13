import type { Furnishing, PlaceCategory, PropertyType } from "@/types/property";

/** Amenity catalogue. Listings reference these by id; the UI maps ids to icons. */
export const amenityLabels: Record<string, string> = {
  // In the unit or house
  aircon: "เครื่องปรับอากาศ",
  "water-heater": "เครื่องทำน้ำอุ่น",
  wardrobe: "ตู้เสื้อผ้าบิวท์อิน",
  kitchen: "ครัวพร้อมเตา",
  washer: "เครื่องซักผ้า",
  fridge: "ตู้เย็น",
  tv: "ทีวี",
  wifi: "อินเทอร์เน็ต",
  bathtub: "อ่างอาบน้ำ",
  garden: "สวนส่วนตัว",
  // Shared by the building or project
  pool: "สระว่ายน้ำ",
  gym: "ฟิตเนส",
  security: "รปภ. 24 ชม.",
  cctv: "กล้องวงจรปิด",
  parking: "ที่จอดรถ",
  keycard: "คีย์การ์ด",
  coworking: "Co-working space",
  ev: "ที่ชาร์จรถไฟฟ้า",
  shuttle: "รถรับส่งไปรถไฟฟ้า",
  park: "สวนส่วนกลาง",
  pet: "เลี้ยงสัตว์ได้",
};

export const furnishingLabels: Record<Furnishing, string> = {
  fully: "ตกแต่งครบ พร้อมอยู่",
  partly: "ตกแต่งบางส่วน",
  unfurnished: "ห้องเปล่า",
};

export const placeCategoryLabels: Record<PlaceCategory, string> = {
  shopping: "ห้างและตลาด",
  hospital: "โรงพยาบาล",
  education: "สถานศึกษา",
  park: "สวนสาธารณะ",
  office: "อาคารสำนักงาน",
};

/** What each property type can offer, used to generate mock detail. */
export const featurePoolByType: Record<PropertyType, string[]> = {
  condo: ["aircon", "water-heater", "wardrobe", "kitchen", "washer", "fridge", "tv", "wifi", "bathtub"],
  house: ["aircon", "water-heater", "wardrobe", "kitchen", "washer", "fridge", "garden", "bathtub"],
  townhouse: ["aircon", "water-heater", "wardrobe", "kitchen", "washer"],
  land: [],
  commercial: ["aircon", "wifi"],
};

export const facilityPoolByType: Record<PropertyType, string[]> = {
  condo: ["pool", "gym", "security", "cctv", "parking", "keycard", "coworking", "pet", "ev", "shuttle", "park"],
  house: ["security", "cctv", "park", "pool", "gym"],
  townhouse: ["security", "cctv", "park"],
  land: [],
  commercial: ["security", "cctv", "parking"],
};

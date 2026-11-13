import type { NearbyPlace } from "@/types/property";

/**
 * Landmarks around each area (keyed by `Property.locationId`), with rough
 * distances from the area's station. Stand-in for a places/POI service.
 */
export const placesByLocation: Record<string, NearbyPlace[]> = {
  ari: [
    { name: "ลาวิลล่า อารีย์", category: "shopping", distance: 300 },
    { name: "โรงพยาบาลพญาไท 2", category: "hospital", distance: 1200 },
    { name: "สวนสมเด็จพระนางเจ้าสิริกิติ์", category: "park", distance: 2600 },
    { name: "อาคารเอสเอ็ม ทาวเวอร์", category: "office", distance: 650 },
  ],
  asok: [
    { name: "เทอร์มินอล 21", category: "shopping", distance: 150 },
    { name: "มหาวิทยาลัยศรีนครินทรวิโรฒ", category: "education", distance: 700 },
    { name: "สวนเบญจกิติ", category: "park", distance: 1100 },
    { name: "โรงพยาบาลบำรุงราษฎร์", category: "hospital", distance: 1500 },
  ],
  "asok-mrt": [
    { name: "เทอร์มินอล 21", category: "shopping", distance: 200 },
    { name: "สวนเบญจกิติ", category: "park", distance: 900 },
    { name: "ศูนย์ประชุมแห่งชาติสิริกิติ์", category: "office", distance: 1300 },
  ],
  "phrom-phong": [
    { name: "เอ็มโพเรียม และ เอ็มควอเทียร์", category: "shopping", distance: 100 },
    { name: "สวนเบญจสิริ", category: "park", distance: 150 },
    { name: "โรงพยาบาลสมิติเวช สุขุมวิท", category: "hospital", distance: 1400 },
    { name: "โรงเรียนนานาชาติในย่านสุขุมวิท 39", category: "education", distance: 900 },
  ],
  thonglor: [
    { name: "ทองหล่อ ซอย 10 คอมมูนิตี้มอลล์", category: "shopping", distance: 800 },
    { name: "โรงพยาบาลคามิลเลียน", category: "hospital", distance: 1300 },
    { name: "สวนเบญจสิริ", category: "park", distance: 1600 },
  ],
  ekkamai: [
    { name: "เกตเวย์ เอกมัย", category: "shopping", distance: 100 },
    { name: "สถานีขนส่งเอกมัย", category: "office", distance: 200 },
    { name: "โรงเรียนเอกมัย", category: "education", distance: 1500 },
  ],
  "on-nut": [
    { name: "ตลาดอ่อนนุช", category: "shopping", distance: 300 },
    { name: "โรงพยาบาลสุขุมวิท", category: "hospital", distance: 1200 },
    { name: "สวนหลวง ร.9", category: "park", distance: 6000 },
  ],
  "sala-daeng": [
    { name: "สีลม คอมเพล็กซ์", category: "shopping", distance: 100 },
    { name: "สวนลุมพินี", category: "park", distance: 500 },
    { name: "โรงพยาบาลจุฬาลงกรณ์", category: "hospital", distance: 600 },
    { name: "ย่านธุรกิจสีลม", category: "office", distance: 300 },
  ],
  "chong-nonsi": [
    { name: "มหานคร คิวบ์", category: "shopping", distance: 200 },
    { name: "ย่านธุรกิจสาทร", category: "office", distance: 300 },
    { name: "โรงพยาบาลบีเอ็นเอช", category: "hospital", distance: 1400 },
  ],
  surasak: [
    { name: "โรงเรียนอัสสัมชัญ", category: "education", distance: 900 },
    { name: "โรงพยาบาลเซนต์หลุยส์", category: "hospital", distance: 700 },
    { name: "ถนนเจริญกรุง", category: "shopping", distance: 600 },
  ],
  "saphan-taksin": [
    { name: "ท่าเรือสาทร", category: "shopping", distance: 150 },
    { name: "ไอคอนสยาม", category: "shopping", distance: 1900 },
    { name: "โรงพยาบาลเลิดสิน", category: "hospital", distance: 1500 },
  ],
  "huai-khwang": [
    { name: "ตลาดห้วยขวาง", category: "shopping", distance: 200 },
    { name: "โรงพยาบาลพระราม 9", category: "hospital", distance: 1700 },
    { name: "อาคารสำนักงานย่านรัชดาภิเษก", category: "office", distance: 600 },
  ],
  rama9: [
    { name: "เซ็นทรัล พระราม 9", category: "shopping", distance: 100 },
    { name: "โรงพยาบาลพระราม 9", category: "hospital", distance: 1100 },
    { name: "อาคารสำนักงานย่านพระราม 9", category: "office", distance: 300 },
  ],
  lumphini: [
    { name: "สวนลุมพินี", category: "park", distance: 100 },
    { name: "วัน แบงค็อก", category: "shopping", distance: 600 },
    { name: "โรงพยาบาลจุฬาลงกรณ์", category: "hospital", distance: 1000 },
  ],
};

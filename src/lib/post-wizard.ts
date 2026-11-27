import { z } from "zod";
import type { DraftValues, PostStep, PromotionOption } from "@/types/api";

/**
 * The posting wizard's steps, rules and helpers. Shared by the UI (inline
 * errors, stepper, footer count) and the mock API (publish re-checks every
 * step), so both always agree on what "complete" means.
 */

export const postSteps: { id: PostStep; label: string }[] = [
  { id: "type", label: "ประเภททรัพย์" },
  { id: "location", label: "ทำเล" },
  { id: "details", label: "รายละเอียด" },
  { id: "photos", label: "รูปภาพ" },
  { id: "publish", label: "ราคาและเผยแพร่" },
];

export const isPostStep = (value: string): value is PostStep => postSteps.some((s) => s.id === value);

export const defaultDraftValues: DraftValues = {
  posterKind: "owner",
  deal: "sale",
  exactLocation: false,
  stations: [],
  features: [],
  petFriendly: false,
  photos: [],
  negotiable: true,
  transferFee: "split",
  promotion: "none",
  confirmed: false,
};

export const MIN_PHOTOS = 5;
export const MAX_PHOTOS = 30;
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const MIN_PHOTO_WIDTH = 1200;
export const TITLE_MAX = 80;
export const DESCRIPTION_MIN = 100;
export const MAX_STATIONS = 3;
/** Sanity floors for prices (THB). Working defaults, not from the design; adjust with the business. */
export const MIN_SALE_PRICE = 100_000;
export const MIN_RENT_PRICE = 1_000;
/** Free listings an owner can have live at once (design handoff §6). */
export const FREE_LISTING_LIMIT = 2;

/** Thai digits (๐–๙) as 0–9, so rules about numbers also catch them. */
const arabicDigits = (text: string) => text.replace(/[๐-๙]/g, (d) => String(d.charCodeAt(0) - 0x0e50));

/** Phone numbers and LINE IDs belong in the contact buttons, not the title. */
const hasContact = (text: string) =>
  /0\d{8,9}/.test(arabicDigits(text).replace(/[\s.-]/g, "")) || /line\s*(id)?\s*[:@]|@\w{3,}/i.test(text);

const isWhole = (n: number) => Number.isInteger(n) && n > 0;

const currentBuddhistYear = new Date().getFullYear() + 543;

const hasRooms = (v: Pick<DraftValues, "propertyType">) => v.propertyType !== "land" && v.propertyType !== "commercial";
const isCondo = (v: Pick<DraftValues, "propertyType">) => v.propertyType === "condo";

/** One issue per field: `[field, message]`. Pure function so the mock API can reuse it. */
type Check = (v: DraftValues) => [keyof DraftValues & string, string][];

const typeCheck: Check = (v) => {
  const issues: ReturnType<Check> = [];
  if (v.posterKind === "developer")
    issues.push(["posterKind", "ผู้พัฒนาโครงการลงประกาศผ่านทีมพาร์ทเนอร์ ติดต่อตามข้อมูลด้านล่าง"]);
  if (!v.propertyType) issues.push(["propertyType", "เลือกประเภททรัพย์"]);
  return issues;
};

const locationCheck: Check = (v) => {
  const issues: ReturnType<Check> = [];
  if (!v.projectName?.trim() && !v.road?.trim()) issues.push(["road", "กรอกชื่อโครงการ หรือถนนที่ตั้งทรัพย์"]);
  if (!v.district?.trim()) issues.push(["district", "กรอกเขตหรืออำเภอ"]);
  if (!v.province?.trim()) issues.push(["province", "กรอกจังหวัด"]);
  if (!v.point) issues.push(["point", "ปักหมุดตำแหน่งทรัพย์บนแผนที่"]);
  if (v.stations.length > MAX_STATIONS) issues.push(["stations", `เลือกได้สูงสุด ${MAX_STATIONS} สถานี`]);
  return issues;
};

const detailsCheck: Check = (v) => {
  const issues: ReturnType<Check> = [];
  if (hasRooms(v) && v.bedrooms === undefined) issues.push(["bedrooms", "เลือกจำนวนห้องนอน"]);
  if (v.propertyType !== "land" && v.bathrooms === undefined) issues.push(["bathrooms", "เลือกจำนวนห้องน้ำ"]);
  if (!v.area || v.area <= 0) issues.push(["area", v.propertyType === "land" ? "กรอกขนาดที่ดิน" : "กรอกพื้นที่ใช้สอย"]);
  if (isCondo(v) && v.floor === undefined) issues.push(["floor", "กรอกชั้นที่ห้องตั้งอยู่"]);
  if (v.floor !== undefined && !isWhole(v.floor)) issues.push(["floor", "กรอกเลขชั้นเป็นจำนวนเต็มตั้งแต่ 1"]);
  if (v.floor && v.totalFloors && v.floor > v.totalFloors)
    issues.push(["floor", `ชั้นต้องไม่เกินจำนวนชั้นของอาคาร (${v.totalFloors})`]);
  if (v.totalFloors !== undefined && !isWhole(v.totalFloors))
    issues.push(["totalFloors", "กรอกจำนวนชั้นเป็นจำนวนเต็มตั้งแต่ 1"]);
  if (v.parking !== undefined && !Number.isInteger(v.parking))
    issues.push(["parking", "กรอกจำนวนที่จอดรถเป็นจำนวนเต็ม"]);
  if (v.yearBuilt && (v.yearBuilt < 2400 || v.yearBuilt > currentBuddhistYear + 5))
    issues.push(["yearBuilt", "กรอกปี พ.ศ. เช่น 2563"]);
  const title = v.title?.trim() ?? "";
  if (title.length < 10) issues.push(["title", "หัวข้อต้องมีอย่างน้อย 10 ตัวอักษร"]);
  else if (title.length > TITLE_MAX) issues.push(["title", `หัวข้อยาวได้ไม่เกิน ${TITLE_MAX} ตัวอักษร`]);
  else if (hasContact(title)) issues.push(["title", "ห้ามใส่เบอร์โทรหรือ LINE ID ในหัวข้อ"]);
  const description = v.description?.trim() ?? "";
  if (description.length < DESCRIPTION_MIN)
    issues.push([
      "description",
      `รายละเอียดต้องมีอย่างน้อย ${DESCRIPTION_MIN} ตัวอักษร (ตอนนี้ ${description.length})`,
    ]);
  return issues;
};

const videoUrl = z.url().refine((u) => /youtube\.com|youtu\.be|tiktok\.com|matterport\.com/i.test(u));

const photosCheck: Check = (v) => {
  const issues: ReturnType<Check> = [];
  const ready = v.photos.filter((p) => p.status === "ready" && !p.isFloorPlan).length;
  if (ready < MIN_PHOTOS) issues.push(["photos", `ต้องมีรูปที่ผ่านอย่างน้อย ${MIN_PHOTOS} รูป (ตอนนี้ ${ready})`]);
  if (v.videoUrl && !videoUrl.safeParse(v.videoUrl).success)
    issues.push(["videoUrl", "ใส่ลิงก์จาก YouTube, TikTok หรือ Matterport"]);
  return issues;
};

const publishCheck: Check = (v) => {
  const issues: ReturnType<Check> = [];
  if (v.deal !== "rent") {
    if (!v.price) issues.push(["price", "กรอกราคาขาย"]);
    else if (v.price < MIN_SALE_PRICE)
      issues.push(["price", `ราคาขายต้องไม่ต่ำกว่า ฿${MIN_SALE_PRICE.toLocaleString("th-TH")}`]);
  }
  if (v.deal !== "sale") {
    if (!v.rentPrice) issues.push(["rentPrice", "กรอกค่าเช่าต่อเดือน"]);
    else if (v.rentPrice < MIN_RENT_PRICE)
      issues.push(["rentPrice", `ค่าเช่าต้องไม่ต่ำกว่า ฿${MIN_RENT_PRICE.toLocaleString("th-TH")} ต่อเดือน`]);
  }
  if (!v.confirmed) issues.push(["confirmed", "ยืนยันข้อมูลและยอมรับกฎการลงประกาศก่อนเผยแพร่"]);
  return issues;
};

const checks: Record<PostStep, Check> = {
  type: typeCheck,
  location: locationCheck,
  details: detailsCheck,
  photos: photosCheck,
  publish: publishCheck,
};

export type StepErrors = Partial<Record<keyof DraftValues & string, string>>;

/** First message per field for one step; empty when the step is complete. */
export function stepErrors(step: PostStep, values: DraftValues): StepErrors {
  const out: StepErrors = {};
  for (const [field, message] of checks[step](values)) out[field] ??= message;
  return out;
}

export const isStepValid = (step: PostStep, values: DraftValues) => Object.keys(stepErrors(step, values)).length === 0;

/** Fields whose value differs between two copies of the values (edit mode's unsaved-changes count). */
export function changedFields(before: DraftValues, after: DraftValues): (keyof DraftValues)[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)] as (keyof DraftValues)[]);
  return [...keys].filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}

/** Steps a visitor may open: every completed step plus the first one not yet completed. */
export function reachableSteps(completed: PostStep[]): PostStep[] {
  const out: PostStep[] = [];
  for (const { id } of postSteps) {
    out.push(id);
    if (!completed.includes(id)) break;
  }
  return out;
}

export function nextStep(step: PostStep): PostStep | undefined {
  return postSteps[postSteps.findIndex((s) => s.id === step) + 1]?.id;
}

export function previousStep(step: PostStep): PostStep | undefined {
  return postSteps[postSteps.findIndex((s) => s.id === step) - 1]?.id;
}

export const stepIndex = (step: PostStep) => postSteps.findIndex((s) => s.id === step);

/** Promotion catalogue (design handoff §6, VAT included). `slotsLeft` comes from the API. */
export const promotionCatalog: PromotionOption[] = [
  { id: "none", title: "ประกาศปกติ", description: "แสดงตามลำดับเวลาที่ลงหรือดันล่าสุด", price: 0 },
  {
    id: "auto_bump",
    title: "ดันประกาศ 7 วัน",
    description: "ดันขึ้นบนสุดของผลค้นหาวันละ 1 ครั้งอัตโนมัติ",
    price: 199,
    days: 7,
  },
  {
    id: "featured",
    title: "ประกาศแนะนำ 14 วัน",
    description: "อยู่ในแถบแนะนำของผลค้นหา มีป้าย “แนะนำ” และดันอัตโนมัติ",
    price: 590,
    days: 14,
    badge: "คุ้มที่สุด",
  },
  {
    id: "homepage_pin",
    title: "ปักหมุดหน้าแรก 7 วัน",
    description: "แสดงในส่วนไฮไลต์บนหน้าแรก จำกัด 24 ประกาศต่อวัน",
    price: 1490,
    days: 7,
  },
];

/** A draft description from what the poster entered ("ช่วยร่างจากข้อมูลที่กรอก"). */
export function draftDescription(v: DraftValues, stationNames: Record<string, string>): string {
  const rooms =
    v.propertyType === "land"
      ? `ที่ดินขนาด ${v.area ?? "-"} ตร.ว.`
      : `${v.bedrooms === 0 ? "ห้องสตูดิโอ" : v.bedrooms ? `${v.bedrooms} ห้องนอน` : ""} ${v.bathrooms ? `${v.bathrooms} ห้องน้ำ` : ""} พื้นที่ใช้สอย ${v.area ?? "-"} ตร.ม.`.trim();
  const where = [
    v.projectName && `ในโครงการ${v.projectName}`,
    v.floor && `ชั้น ${v.floor}`,
    v.facing && `หันทิศ${v.facing.replace(/^ทิศ/, "")}`,
  ]
    .filter(Boolean)
    .join(" ");
  const near = v.stations.length
    ? `เดินทางสะดวก ใกล้สถานี${v.stations.map((c) => stationNames[c] ?? c).join(" และ ")}`
    : "เดินทางสะดวก เข้าถึงถนนสายหลักได้หลายเส้นทาง";
  const finish =
    v.furnishing === "fully"
      ? "ตกแต่งครบ พร้อมเข้าอยู่ เครื่องใช้ไฟฟ้าครบ"
      : v.furnishing === "partly"
        ? "มีเฟอร์นิเจอร์บิวท์อินบางส่วน"
        : v.furnishing === "unfurnished"
          ? "ห้องเปล่า ตกแต่งได้ตามสไตล์ของคุณ"
          : "";
  const pets = v.petFriendly ? "เลี้ยงสัตว์ได้" : "";
  return [
    `${rooms} ${where}`.trim(),
    near,
    [finish, pets].filter(Boolean).join(" "),
    "นัดดูได้ทุกวัน สอบถามรายละเอียดเพิ่มเติมผ่านปุ่มส่งข้อความ",
  ]
    .filter(Boolean)
    .join("\n\n");
}

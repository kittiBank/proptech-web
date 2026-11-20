/**
 * Public agent profiles (A7, A9): what an agent writes about themselves.
 * Contact details and verification come from `posters.ts`; listing counts and
 * areas served are worked out from their live listings in `mocks/db.ts`.
 */
export interface AgentSeed {
  /** URL slug for `/agents/[slug]`. */
  slug: string;
  /** Must match `Property.agent.name` on their listings. */
  name: string;
  about: string;
  yearsExperience: number;
  /** People on the agent's team, when they work with one. */
  teamSize?: number;
  workingHours: string;
}

export const agentSeeds: AgentSeed[] = [
  {
    slug: "kittipat-srisuk",
    name: "กิตติพัฒน์ ศรีสุข",
    about:
      "ดูแลคอนโดและบ้านเดี่ยวย่านสุขุมวิทตอนกลาง ตั้งแต่อโศกถึงเอกมัยมา 7 ปี เน้นลูกค้าที่ซื้ออยู่เองและนักลงทุนต่างชาติ ช่วยประสานงานยื่นกู้ ตรวจรับห้อง และดูแลสัญญาเช่าหลังการขาย",
    yearsExperience: 7,
    teamSize: 6,
    workingHours: "จันทร์–เสาร์ 9:00–19:00",
  },
  {
    slug: "natcha-prasertwong",
    name: "ณัฐชา ประเสริฐวงศ์",
    about:
      "นายหน้าคอนโดแนวรถไฟฟ้าทั้ง BTS และ MRT ช่วยผู้เช่าหาห้องใกล้ที่ทำงาน และช่วยเจ้าของปล่อยเช่าพร้อมคัดกรองผู้เช่า ทำสัญญา และตรวจสภาพห้องก่อนส่งมอบ",
    yearsExperience: 5,
    teamSize: 3,
    workingHours: "ทุกวัน 10:00–20:00",
  },
  {
    slug: "anan-thongdee",
    name: "อนันต์ ทองดี",
    about:
      "เชี่ยวชาญบ้านเดี่ยวและทาวน์โฮมย่านพระราม 9 ห้วยขวาง และรัชดา ให้คำแนะนำเรื่องภาษีและค่าธรรมเนียมการโอน และพาดูทรัพย์ได้ทั้งวันธรรมดาและวันหยุด",
    yearsExperience: 4,
    workingHours: "จันทร์–ศุกร์ 9:00–18:00",
  },
  {
    slug: "baandee-property",
    name: "บ้านดี พร็อพเพอร์ตี้",
    about:
      "บริษัทนายหน้าอสังหาริมทรัพย์ที่มีทีมดูแลทั้งกรุงเทพฯ รับฝากขายและเช่าบ้าน คอนโด และที่ดิน พร้อมทีมสินเชื่อช่วยเตรียมเอกสารยื่นกู้",
    yearsExperience: 12,
    teamSize: 18,
    workingHours: "ทุกวัน 9:00–18:00",
  },
];

const bySlug = new Map(agentSeeds.map((a) => [a.slug, a]));
const byName = new Map(agentSeeds.map((a) => [a.name, a]));

export const findAgentSeed = (slug: string) => bySlug.get(slug);
export const agentSlugForName = (name: string) => byName.get(name)?.slug;

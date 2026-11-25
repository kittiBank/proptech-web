/**
 * Help center content (D4). Static until the CMS (E9) serves it; copy is a
 * placeholder to review before launch (handoff §8).
 */

export type HelpTopic = "posting" | "billing" | "viewings" | "account" | "safety" | "agents";

export const helpTopics: { id: HelpTopic; title: string; description: string }[] = [
  { id: "posting", title: "ลงประกาศ", description: "ขั้นตอน รูปภาพ การตรวจประกาศ" },
  { id: "billing", title: "แพ็กเกจและการชำระเงิน", description: "ราคา ใบกำกับภาษี การคืนเงิน" },
  { id: "viewings", title: "นัดดูทรัพย์และแชต", description: "ส่งคำขอนัด ยกเลิก เลื่อนนัด" },
  { id: "account", title: "บัญชีและการเข้าสู่ระบบ", description: "Google LINE รหัสผ่าน ลบบัญชี" },
  { id: "safety", title: "ความปลอดภัย", description: "สังเกตมิจฉาชีพ แจ้งประกาศปลอม" },
  { id: "agents", title: "นายหน้าและยืนยันตัวตน", description: "เอกสาร ระยะเวลาตรวจ ป้ายยืนยัน" },
];

export interface HelpFaq {
  id: string;
  topic: HelpTopic;
  question: string;
  answer: string;
  /** Optional next step under the answer. */
  link?: { label: string; href: string };
}

export const helpFaqs: HelpFaq[] = [
  {
    id: "listing-rejected",
    topic: "posting",
    question: "ทำไมประกาศของฉันไม่ผ่านการตรวจ",
    answer:
      "สาเหตุที่พบบ่อยคือรูปมีลายน้ำหรือเบอร์โทร ราคาไม่สมเหตุสมผล หรือข้อมูลซ้ำกับประกาศอื่น อีเมลแจ้งผลจะบอกจุดที่ต้องแก้ แก้แล้วกดส่งตรวจใหม่ได้ทันที ไม่เสียโควตาเพิ่ม",
    link: { label: "อ่านกฎการลงประกาศ", href: "/legal/listing-rules" },
  },
  {
    id: "review-time",
    topic: "posting",
    question: "ตรวจประกาศใช้เวลานานแค่ไหน",
    answer: "ส่วนใหญ่ภายใน 2 ชั่วโมงในเวลาทำการ ประกาศที่ซื้อโปรโมตจะได้รับการตรวจก่อน",
  },
  {
    id: "photo-rules",
    topic: "posting",
    question: "รูปแบบไหนที่ใช้ได้",
    answer:
      "JPG, PNG หรือ HEIC กว้างอย่างน้อย 1,200 px ไม่มีลายน้ำเว็บอื่นหรือเบอร์โทร ใส่ได้สูงสุด 30 รูป รูปแรกคือรูปปก",
  },
  {
    id: "cancel-renewal",
    topic: "billing",
    question: "ยกเลิกการต่ออายุแพ็กเกจอย่างไร",
    answer:
      "ไปที่ การชำระเงินและใบกำกับภาษี แล้วกด ยกเลิกต่ออายุ แพ็กเกจยังใช้ได้ถึงสิ้นรอบบิล ประกาศที่เกินโควตาฟรีจะถูกพักไว้",
    link: { label: "ไปที่การชำระเงิน", href: "/dashboard/billing" },
  },
  {
    id: "refund",
    topic: "billing",
    question: "ถ้าประกาศไม่ผ่านการตรวจ ได้เงินค่าโปรโมตคืนไหม",
    answer: "คืนเต็มจำนวนเป็นช่องทางเดิมหรือเป็นเครดิต ตามที่คุณเลือก โปรโมตเริ่มนับเมื่อประกาศผ่านการตรวจเท่านั้น",
  },
  {
    id: "tax-invoice",
    topic: "billing",
    question: "ขอใบกำกับภาษีเต็มรูปได้ไหม",
    answer: "ได้ ใส่ข้อมูลบริษัทครั้งเดียวที่หน้าการชำระเงิน ระบบออกใบกำกับภาษีให้ทุกยอดอัตโนมัติ",
  },
  {
    id: "no-reply",
    topic: "viewings",
    question: "ผู้ลงประกาศไม่ตอบคำขอนัด ทำอย่างไรดี",
    answer:
      "คำขอนัดจะหมดอายุเองเมื่อไม่มีคำตอบใน 24 ชั่วโมง คุณส่งคำขอใหม่ หรือทักแชตถามได้ ระหว่างนี้ลองดูประกาศใกล้เคียงไว้เป็นทางเลือก",
    link: { label: "ดูนัดของฉัน", href: "/account/appointments" },
  },
  {
    id: "reschedule",
    topic: "viewings",
    question: "เลื่อนหรือยกเลิกนัดดูทรัพย์ได้ไหม",
    answer: "ได้ ยกเลิกได้จากหน้านัดดูทรัพย์หรือในแชต แล้วส่งคำขอเวลาใหม่ ผู้ลงประกาศจะได้รับแจ้งทันที",
  },
  {
    id: "change-phone",
    topic: "account",
    question: "เปลี่ยนเบอร์โทรที่แสดงบนประกาศได้ไหม",
    answer: "ได้ที่ โปรไฟล์และการตั้งค่า เบอร์ใหม่ต้องยืนยันด้วยรหัส OTP ก่อน แล้วจะแสดงบนทุกประกาศของคุณ",
    link: { label: "ไปที่โปรไฟล์", href: "/account/profile" },
  },
  {
    id: "delete-account",
    topic: "account",
    question: "ลบบัญชีได้อย่างไร",
    answer:
      "ที่ โปรไฟล์และการตั้งค่า หัวข้อความเป็นส่วนตัว ขอไฟล์ข้อมูลของคุณก่อนลบได้ การลบจะปิดประกาศทั้งหมดและลบแชต",
  },
  {
    id: "deposit-scam",
    topic: "safety",
    question: "ถูกขอให้โอนมัดจำก่อนดูห้อง ควรทำอย่างไร",
    answer:
      "อย่าโอนเงินก่อนได้ดูห้องจริงและตรวจเอกสารสิทธิ์ ผู้ลงประกาศตัวจริงไม่จำเป็นต้องขอมัดจำก่อนนัด แจ้งประกาศนั้นให้เราตรวจ ถ้าโอนไปแล้ว แจ้งความที่ thaipoliceonline.go.th และติดต่อธนาคารเพื่ออายัดบัญชีทันที",
  },
  {
    id: "report-listing",
    topic: "safety",
    question: "แจ้งประกาศที่น่าสงสัยอย่างไร",
    answer:
      "เปิดหน้าประกาศ แล้วกด แจ้งประกาศ ใต้ข้อมูลผู้ลงประกาศ เลือกเหตุผลและเล่าเพิ่มเติม ผู้ลงประกาศจะไม่รู้ว่าใครเป็นคนแจ้ง ทีมงานตรวจภายใน 24 ชั่วโมง",
  },
  {
    id: "kyc-docs",
    topic: "agents",
    question: "ยืนยันตัวตนนายหน้าต้องใช้เอกสารอะไร",
    answer:
      "บัตรประชาชนด้านหน้าและหลัง กับเซลฟีคู่บัตร ถ้าสังกัดบริษัท แนบหนังสือรับรองบริษัทหรือนามบัตรได้ ทีมงานตรวจภายใน 1 วันทำการ",
    link: { label: "เริ่มยืนยันตัวตน", href: "/dashboard/verify" },
  },
  {
    id: "verified-badge",
    topic: "agents",
    question: "ป้ายยืนยันตัวตนแล้วหมายถึงอะไร",
    answer:
      "เราตรวจบัตรประชาชนของผู้ลงประกาศแล้วว่าเป็นบุคคลจริง ไม่ได้รับรองราคาหรือสภาพทรัพย์ ควรตรวจเอกสารสิทธิ์ทุกครั้งก่อนตกลง",
  },
];

/** Case-insensitive match on question and answer; Thai has no word breaks, so a substring is enough. */
export function searchFaqs(q: string, topic?: HelpTopic): HelpFaq[] {
  const needle = q.trim().toLowerCase();
  return helpFaqs.filter(
    (f) =>
      (!topic || f.topic === topic) &&
      (!needle || f.question.toLowerCase().includes(needle) || f.answer.toLowerCase().includes(needle)),
  );
}

export const supportChannels = {
  lineId: "@propertyhub",
  lineUrl: "https://line.me/R/ti/p/@propertyhub",
  hours: "จันทร์ ถึง เสาร์ 09:00 ถึง 18:00",
};

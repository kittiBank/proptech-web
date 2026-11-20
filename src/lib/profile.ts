import type { ProfileDto } from "@/types/api";

/**
 * "โปรไฟล์ครบ 70%" (B7, B20): how complete a profile is and the most useful
 * next step. A verified phone matters most, since it unlocks messaging.
 */
const steps: { id: ProfileStep; weight: number; done: (p: ProfileDto) => boolean; label: string; cta: string }[] = [
  {
    id: "name",
    weight: 20,
    done: (p) => Boolean(p.firstName && p.lastName),
    label: "กรอกชื่อและนามสกุล",
    cta: "กรอกชื่อ",
  },
  { id: "email", weight: 20, done: (p) => p.emailVerified, label: "ยืนยันอีเมล", cta: "ยืนยันอีเมล" },
  {
    id: "phone",
    weight: 30,
    done: (p) => p.phoneVerified,
    label: "ยืนยันเบอร์โทรเพื่อส่งข้อความถึงผู้ลงประกาศได้ทันที",
    cta: "ยืนยันเบอร์โทร",
  },
  {
    id: "avatar",
    weight: 15,
    done: (p) => Boolean(p.avatarUrl),
    label: "เพิ่มรูปโปรไฟล์ให้ผู้ลงประกาศจำคุณได้",
    cta: "เพิ่มรูป",
  },
  {
    id: "line",
    weight: 15,
    done: (p) => Boolean(p.lineId),
    label: "เพิ่ม LINE ID เพื่อคุยกับผู้ลงประกาศได้สะดวก",
    cta: "เพิ่ม LINE ID",
  },
];

export type ProfileStep = "name" | "email" | "phone" | "avatar" | "line";

export function profileCompleteness(profile: ProfileDto) {
  const percent = steps.reduce((sum, s) => sum + (s.done(profile) ? s.weight : 0), 0);
  // Highest-weight missing step first.
  const next = [...steps].sort((a, b) => b.weight - a.weight).find((s) => !s.done(profile));
  return { percent, next: next && { id: next.id, label: next.label, cta: next.cta } };
}

/** "0812345678" → "081-234-5678"; anything else is returned as typed. */
export function formatThaiPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  return phone;
}

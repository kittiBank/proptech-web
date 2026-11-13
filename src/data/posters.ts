import type { Poster } from "@/types/property";

/**
 * Owner and agent profiles, keyed by the name on `Property.agent`.
 * Stand-in for the accounts service. Phone numbers use the 02-000 range
 * so they never ring a real person.
 */
const profiles: Omit<Poster, "id" | "kind">[] = [
  {
    name: "ณัฐชา ประเสริฐวงศ์",
    company: "แลนด์มาร์ค พร็อพเพอร์ตี้ เอเจนซี่",
    phone: "02-000-1101",
    lineId: "natcha.home",
    memberSince: "2021-03-14",
    activeListings: 38,
    responseMinutes: 15,
    phoneVerified: true,
    idVerified: true,
    languages: ["ไทย", "English"],
  },
  {
    name: "กิตติพัฒน์ ศรีสุข",
    company: "สุขุมวิท เรียลตี้",
    phone: "02-000-1102",
    lineId: "kittipat.realty",
    memberSince: "2019-08-02",
    activeListings: 64,
    responseMinutes: 30,
    phoneVerified: true,
    idVerified: true,
    languages: ["ไทย", "English", "中文"],
  },
  {
    name: "อนันต์ ทองดี",
    company: "ทองดี แอสเซท",
    phone: "02-000-1103",
    lineId: "anan.td",
    memberSince: "2022-01-20",
    activeListings: 21,
    responseMinutes: 45,
    phoneVerified: true,
    idVerified: false,
    languages: ["ไทย"],
  },
  {
    name: "ปวีณา อินทรสุวรรณ",
    phone: "02-000-1104",
    lineId: "paweena.i",
    memberSince: "2024-06-11",
    activeListings: 2,
    responseMinutes: 90,
    phoneVerified: true,
    idVerified: true,
    languages: ["ไทย"],
  },
  {
    name: "ธนพล เจริญรัตน์",
    phone: "02-000-1105",
    memberSince: "2023-09-30",
    activeListings: 3,
    responseMinutes: 120,
    phoneVerified: true,
    idVerified: false,
    languages: ["ไทย", "English"],
  },
];

const byName = new Map(profiles.map((p) => [p.name, p]));

function slugify(name: string, index: number) {
  return `u-${index.toString(36)}-${name.length}`;
}

/** Profile for a listing's poster; unknown names get a plain unverified profile. */
export function findPoster(agent: { name: string; kind: "owner" | "agent" }, seed: number): Poster {
  const known = byName.get(agent.name);
  if (known) return { ...known, id: slugify(agent.name, profiles.indexOf(known)), kind: agent.kind };
  return {
    id: slugify(agent.name, 100 + (seed % 900)),
    name: agent.name,
    kind: agent.kind,
    phone: `02-000-${String(2000 + (seed % 8000)).padStart(4, "0")}`,
    memberSince: `202${seed % 5}-0${1 + (seed % 9)}-15`,
    activeListings: agent.kind === "agent" ? 5 + (seed % 40) : 1 + (seed % 3),
    responseMinutes: [20, 45, 60, 180][seed % 4],
    phoneVerified: true,
    idVerified: seed % 3 !== 0,
    languages: ["ไทย"],
  };
}

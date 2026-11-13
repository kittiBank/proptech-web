import type { ReactNode } from "react";
import { Bath, BedDouble, Building, Car, LandPlot, Maximize2, Sofa } from "lucide-react";
import { furnishingLabels } from "@/data/amenities";
import { propertyTypeLabels } from "@/data/catalog";
import { formatListingPrice, formatNumber } from "@/lib/format";
import { formatLandSize, formatThaiDate, toBuddhistYear } from "@/lib/listing";
import type { PropertyDetail } from "@/types/property";

interface Fact {
  icon: ReactNode;
  value: string;
  label: string;
}

const icon = (Icon: typeof Bath) => <Icon className="size-5 text-brand" strokeWidth={1.75} aria-hidden="true" />;

/** The numbers people compare first, in one row of cells. */
export function KeyFacts({ property: p }: { property: PropertyDetail }) {
  const hasRooms = p.type !== "land" && p.type !== "commercial";
  const candidates: (Fact | false | 0 | undefined)[] = [
    hasRooms && {
      icon: icon(BedDouble),
      value: p.bedrooms === 0 ? "สตูดิโอ" : String(p.bedrooms),
      label: "ห้องนอน",
    },
    p.bathrooms > 0 && { icon: icon(Bath), value: String(p.bathrooms), label: "ห้องน้ำ" },
    p.type !== "land" && { icon: icon(Maximize2), value: `${formatNumber(p.area)} ตร.ม.`, label: "พื้นที่ใช้สอย" },
    p.landSize && { icon: icon(LandPlot), value: `${formatNumber(p.landSize)} ตร.ว.`, label: "ขนาดที่ดิน" },
    p.floor && {
      icon: icon(Building),
      value: p.totalFloors ? `${p.floor}/${p.totalFloors}` : String(p.floor),
      label: "ชั้นที่",
    },
    !p.floor &&
      p.totalFloors &&
      p.type !== "condo" && {
        icon: icon(Building),
        value: String(p.totalFloors),
        label: "จำนวนชั้น",
      },
    p.parking > 0 && { icon: icon(Car), value: String(p.parking), label: "ที่จอดรถ" },
    p.furnishing && {
      icon: icon(Sofa),
      value: p.furnishing === "fully" ? "ครบ" : p.furnishing === "partly" ? "บางส่วน" : "ห้องเปล่า",
      label: "การตกแต่ง",
    },
  ];
  const facts = candidates.filter((f): f is Fact => Boolean(f));

  return (
    <ul
      aria-label="ข้อมูลสำคัญ"
      className="grid grid-cols-3 overflow-hidden rounded-lg border border-line sm:grid-cols-[repeat(auto-fit,minmax(112px,1fr))] max-sm:[&>li:last-child:nth-child(3n+1)]:col-span-3 max-sm:[&>li:last-child:nth-child(3n+2)]:col-span-2"
    >
      {facts.map((f) => (
        <li key={f.label} className="-mt-px -ml-px flex flex-col gap-1.5 border-t border-l border-line px-4 py-4">
          {f.icon}
          <span className="text-lg leading-tight font-semibold text-ink tabular-nums">{f.value}</span>
          <span className="text-[13px] text-slate">{f.label}</span>
        </li>
      ))}
    </ul>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-6 border-b border-line py-3 text-[15px]">
      <dt className="shrink-0 text-slate">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  );
}

/** Full spec sheet. Rows without a value are left out rather than shown as "-". */
export function SpecSheet({ property: p }: { property: PropertyDetail }) {
  const pricePerSqm = p.mode === "buy" && p.type !== "land" ? Math.round(p.price / p.area) : undefined;
  const pricePerWah =
    p.mode === "buy" && p.landSize && p.type === "land" ? Math.round(p.price / p.landSize) : undefined;

  const rows: [string, ReactNode][] = [
    ["ประเภททรัพย์", propertyTypeLabels[p.type]],
    ["ประเภทประกาศ", p.mode === "buy" ? "ขาย" : "ให้เช่า"],
    ["ราคา", formatListingPrice(p.price, p.mode)],
    ...(pricePerSqm ? [["ราคาต่อ ตร.ม.", `฿${formatNumber(pricePerSqm)}`] as [string, ReactNode]] : []),
    ...(pricePerWah ? [["ราคาต่อ ตร.ว.", `฿${formatNumber(pricePerWah)}`] as [string, ReactNode]] : []),
    ...(p.commonFee ? [["ค่าส่วนกลาง", `฿${formatNumber(p.commonFee)}/เดือน`] as [string, ReactNode]] : []),
    ...(p.depositMonths
      ? [["เงินประกัน และค่าเช่าล่วงหน้า", `${p.depositMonths} + ${p.advanceMonths ?? 0} เดือน`] as [string, ReactNode]]
      : []),
    ...(p.minContractMonths ? [["สัญญาขั้นต่ำ", `${p.minContractMonths} เดือน`] as [string, ReactNode]] : []),
    ...(p.projectName ? [["โครงการ", p.projectName] as [string, ReactNode]] : []),
    ...(p.type !== "land" ? [["พื้นที่ใช้สอย", `${formatNumber(p.area)} ตร.ม.`] as [string, ReactNode]] : []),
    ...(p.landSize ? [["ขนาดที่ดิน", formatLandSize(p.landSize)] as [string, ReactNode]] : []),
    ...(p.type !== "land" && p.type !== "commercial"
      ? [
          ["ห้องนอน", p.bedrooms === 0 ? "สตูดิโอ" : `${p.bedrooms} ห้อง`] as [string, ReactNode],
          ["ห้องน้ำ", `${p.bathrooms} ห้อง`] as [string, ReactNode],
        ]
      : []),
    ...(p.floor
      ? [["ชั้นที่", p.totalFloors ? `${p.floor} จาก ${p.totalFloors} ชั้น` : `${p.floor}`] as [string, ReactNode]]
      : []),
    ...(!p.floor && p.totalFloors ? [["จำนวนชั้น", `${p.totalFloors} ชั้น`] as [string, ReactNode]] : []),
    ...(p.parking ? [["ที่จอดรถ", `${p.parking} คัน`] as [string, ReactNode]] : []),
    ...(p.facing ? [["หันหน้าไปทาง", p.facing] as [string, ReactNode]] : []),
    ...(p.furnishing ? [["การตกแต่ง", furnishingLabels[p.furnishing]] as [string, ReactNode]] : []),
    ...(p.yearBuilt ? [["ปีที่สร้างเสร็จ", `พ.ศ. ${toBuddhistYear(p.yearBuilt)}`] as [string, ReactNode]] : []),
    ["รหัสประกาศ", p.code],
    ["อัปเดตล่าสุด", formatThaiDate(p.updatedAt)],
  ];

  const half = Math.ceil(rows.length / 2);
  return (
    <div className="grid gap-x-10 md:grid-cols-2">
      {[rows.slice(0, half), rows.slice(half)].map((col, i) => (
        <dl key={i}>
          {col.map(([label, value]) => (
            <Row key={label} label={label}>
              {value}
            </Row>
          ))}
        </dl>
      ))}
    </div>
  );
}

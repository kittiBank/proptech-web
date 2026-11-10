import { Pin } from "lucide-react";
import { PropertyCard } from "@/components/property/property-card";
import { routes } from "@/data/navigation";
import type { Property } from "@/types/property";
import { Container, SectionHeader } from "./section-header";

/** Paid highlight placements: two rows, four per row on desktop. */
export function PinnedProperties({ properties }: { properties: Property[] }) {
  if (properties.length === 0) return null;

  return (
    <section aria-labelledby="pinned-title" className="bg-mist py-16 sm:py-20">
      <Container>
        <SectionHeader
          id="pinned-title"
          title="ประกาศไฮไลต์"
          description={
            <span className="inline-flex flex-wrap items-center gap-x-2">
              <Pin className="size-4 text-brand" aria-hidden="true" />
              ประกาศที่เจ้าของและนายหน้าปักหมุดไว้ ตรวจสอบเอกสารและภาพถ่ายแล้วทุกรายการ
            </span>
          }
          action={{ label: "ปักหมุดประกาศของคุณ", href: `${routes.postProperty}?plan=pin` }}
        />

        <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {properties.slice(0, 8).map((p, i) => (
            <li key={p.id} className="flex">
              <PropertyCard property={p} priority={i < 4} className="w-full" />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

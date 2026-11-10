import Link from "next/link";
import { Building2, House, LandPlot, Store, Warehouse, type LucideIcon } from "lucide-react";
import { routes } from "@/data/navigation";
import { formatNumber } from "@/lib/format";
import type { PropertyCategory, PropertyType } from "@/types/property";
import { Container, SectionHeader } from "./section-header";

const icons: Record<PropertyType, LucideIcon> = {
  condo: Building2,
  house: House,
  townhouse: Warehouse,
  land: LandPlot,
  commercial: Store,
};

export function PropertyCategories({ categories }: { categories: PropertyCategory[] }) {
  return (
    <section aria-labelledby="categories-title" className="bg-mist py-16 sm:py-20">
      <Container>
        <SectionHeader id="categories-title" title="ค้นหาตามประเภทอสังหาฯ" />
        <ul className="mt-8 grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-white sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => {
            const Icon = icons[c.type];
            return (
              <li key={c.type} className="-mt-px -ml-px border-t border-l border-line">
                <Link
                  href={routes.category(c.type)}
                  className="group flex h-full flex-col gap-6 p-5 transition-colors hover:bg-violet-50 sm:p-6"
                >
                  <Icon className="size-7 text-brand" strokeWidth={1.5} aria-hidden="true" />
                  <div>
                    <p className="text-lg font-semibold text-ink group-hover:text-brand-strong">{c.label}</p>
                    <p className="mt-1 text-sm text-slate">{c.description}</p>
                  </div>
                  <p className="mt-auto text-sm text-ink tabular-nums">{formatNumber(c.listingCount)} ประกาศ</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

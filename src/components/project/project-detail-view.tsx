"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Building2, Check, ChevronRight, Images, Phone } from "lucide-react";
import { Container } from "@/components/home/section-header";
import { AmenityList } from "@/components/listing/amenity-list";
import { ListingGallery } from "@/components/listing/listing-gallery";
import { LocationMap } from "@/components/listing/location-map";
import { ShareMenu } from "@/components/listing/share-menu";
import { StationRoutes } from "@/components/listing/station-route";
import { PropertyCard } from "@/components/property/property-card";
import { PropertyPhoto } from "@/components/property/property-photo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CardGridSkeleton, QueryError, Skeleton } from "@/components/ui/query-state";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { propertyTypeLabels } from "@/data/catalog";
import { routes } from "@/data/navigation";
import { ApiError } from "@/lib/api/client";
import { projectQueries, propertyQueries } from "@/lib/api/queries";
import { formatNumber, formatPrice } from "@/lib/format";
import { formatLandSize, formatThaiDate, toBuddhistYear } from "@/lib/listing";
import { cn } from "@/lib/utils";
import type { ProjectDetail, ProjectMilestone, ProjectUnitType } from "@/types/property";
import { formatSizeRange, ProjectCard, ProjectStatusTag } from "./project-card";
import { ViewingForm } from "./viewing-form";

function Section({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("scroll-mt-24 border-t border-line pt-8", className)}>
      <h2 id={id} className="mb-4 text-[22px] font-semibold tracking-[-0.01em] text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Breadcrumb({ project }: { project: ProjectDetail }) {
  return (
    <nav aria-label="เส้นทางหน้า" className="overflow-x-auto">
      <ol className="flex items-center gap-1.5 text-sm whitespace-nowrap text-slate">
        {[
          { label: "หน้าแรก", href: routes.home },
          { label: "โครงการใหม่", href: routes.newProjects },
        ].map((c) => (
          <li key={c.label} className="flex items-center gap-1.5">
            <Link href={c.href} className="hover:text-ink hover:underline">
              {c.label}
            </Link>
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          {project.district.split(",")[0]}
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </li>
        <li aria-current="page" className="text-ink">
          {project.name}
        </li>
      </ol>
    </nav>
  );
}

/** A5/A6 mosaic: one large photo and four small ones; phones get the swipeable gallery. */
function ProjectGallery({ project }: { project: ProjectDetail }) {
  const [open, setOpen] = useState(false);
  const [main, ...rest] = project.gallery;
  const small = rest.slice(0, 4);

  return (
    <section aria-label="รูปภาพโครงการ">
      <div className="lg:hidden">
        <ListingGallery images={project.gallery} title={project.name} />
      </div>
      <div className="hidden h-[440px] grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-2 overflow-hidden rounded-lg lg:grid">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="row-span-2 cursor-zoom-in"
          aria-label={`ดูรูปทั้งหมด: ${main.alt}`}
        >
          <PropertyPhoto image={main} sizes="800px" priority className="h-full" />
        </button>
        {small.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={() => setOpen(true)}
            className="relative cursor-zoom-in"
            aria-label={i === small.length - 1 ? `ดูรูปทั้งหมด ${project.gallery.length} รูป` : `ดูรูป: ${img.alt}`}
          >
            <PropertyPhoto image={img} sizes="320px" className="h-full" />
            {i === small.length - 1 && (
              <span className="absolute right-3 bottom-3 inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3 text-sm font-medium text-ink">
                <Images className="size-4" aria-hidden="true" />
                ดูรูปทั้งหมด {project.gallery.length} รูป
              </span>
            )}
          </button>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:w-[min(1000px,calc(100vw-48px))]">
          <div className="border-b border-line px-5 py-4 pr-16">
            <DialogTitle className="text-lg font-semibold text-ink">รูปภาพโครงการ {project.name}</DialogTitle>
            <DialogDescription className="sr-only">ใช้ปุ่มลูกศรเพื่อเลื่อนดูรูป</DialogDescription>
          </div>
          <div className="p-4">
            <ListingGallery images={project.gallery} title={project.name} />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function KeyFacts({ project: p }: { project: ProjectDetail }) {
  const facts = [
    { value: formatNumber(p.units), label: p.type === "condo" ? "ยูนิต" : "หลัง" },
    p.type === "condo"
      ? { value: `${p.floors} ชั้น`, label: `${p.buildings} อาคาร` }
      : { value: `${p.floors} ชั้น`, label: propertyTypeLabels[p.type] },
    { value: formatLandSize(p.landSize), label: "พื้นที่โครงการ" },
    { value: formatSizeRange(p.sizeRange), label: p.type === "condo" ? "ขนาดห้อง" : "ขนาดที่ดิน" },
    { value: `${p.parkingRatio}%`, label: "ที่จอดรถ" },
    { value: String(toBuddhistYear(p.completionYear)), label: "คาดว่าเสร็จ (พ.ศ.)" },
  ];
  return (
    <ul
      aria-label="ข้อมูลสำคัญ"
      className="grid grid-cols-3 overflow-hidden rounded-lg border border-line sm:grid-cols-6"
    >
      {facts.map((f, i) => (
        <li
          key={f.label}
          className={cn(
            "flex flex-col gap-0.5 p-3.5 sm:p-4",
            i % 3 !== 0 && "border-l border-line",
            i >= 3 && "border-t border-line sm:border-t-0",
            i === 3 && "sm:border-l",
          )}
        >
          <span className="text-[16px] font-semibold text-ink tabular-nums sm:text-[17px]">{f.value}</span>
          <span className="text-[12px] text-slate sm:text-[13px]">{f.label}</span>
        </li>
      ))}
    </ul>
  );
}

function Milestones({ milestones }: { milestones: ProjectMilestone[] }) {
  return (
    <ol className="flex flex-col">
      {milestones.map((m, i) => (
        <li
          key={m.title}
          aria-current={m.state === "current" ? "step" : undefined}
          className="relative grid grid-cols-[28px_1fr] gap-x-3.5 pb-5 last:pb-0 sm:grid-cols-[28px_1fr_auto]"
        >
          {i < milestones.length - 1 && (
            <span
              aria-hidden="true"
              className={cn("absolute top-7 bottom-0 left-[13px] w-0.5", m.state === "done" ? "bg-brand" : "bg-line")}
            />
          )}
          <span
            className={cn(
              "relative z-[1] inline-flex size-7 items-center justify-center rounded-full border-2 text-[13px] font-semibold",
              m.state === "done" && "border-brand bg-brand text-white",
              m.state === "current" && "border-brand bg-white text-brand-strong ring-4 ring-violet-100",
              m.state === "upcoming" && "border-line-strong bg-white text-slate",
            )}
          >
            {m.state === "done" ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : i + 1}
            <span className="sr-only">
              {m.state === "done" ? "เสร็จแล้ว" : m.state === "current" ? "กำลังดำเนินการ" : "ยังไม่เริ่ม"}
            </span>
          </span>
          <div className="pt-0.5">
            <p className="text-[15px] font-semibold text-ink">{m.title}</p>
            <p className="text-sm text-slate">{m.detail}</p>
            <p className="text-[13px] text-slate sm:hidden">{m.date}</p>
          </div>
          <span
            className={cn(
              "hidden pt-0.5 text-sm sm:block",
              m.state === "current" ? "font-medium text-brand-strong" : "text-slate",
            )}
          >
            {m.date}
          </span>
        </li>
      ))}
    </ol>
  );
}

function UnitTypes({
  units,
  selectedId,
  onSelect,
}: {
  units: ProjectUnitType[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-line sm:block">
        <table className="w-full text-left text-[15px]">
          <thead className="bg-mist text-[13px] text-slate">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                แบบห้อง
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                ขนาด
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                ราคาเริ่มต้น
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                ราคา/ตร.ม.
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                เหลือขาย
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">เลือก</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => {
              const selected = u.id === selectedId;
              return (
                <tr key={u.id} className={cn("border-t border-line", selected && "bg-brand-soft")}>
                  <th scope="row" className="px-4 py-3 font-semibold text-ink">
                    {u.name}
                  </th>
                  <td className="px-4 py-3 tabular-nums">{u.area} ตร.ม.</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">฿{formatPrice(u.price)}</td>
                  <td className="px-4 py-3 text-slate tabular-nums">฿{formatNumber(Math.round(u.price / u.area))}</td>
                  <td className={cn("px-4 py-3 tabular-nums", u.unitsLeft <= 3 && "font-medium text-danger")}>
                    {u.unitsLeft <= 3 ? `เหลือ ${u.unitsLeft} ห้อง` : `${u.unitsLeft} ห้อง`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant={selected ? "primary" : "outline"}
                      size="sm"
                      aria-pressed={selected}
                      onClick={() => onSelect(u.id)}
                    >
                      {selected ? "เลือกแล้ว" : "สนใจแบบนี้"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-2.5 sm:hidden">
        {units.map((u) => {
          const selected = u.id === selectedId;
          return (
            <li key={u.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(u.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left",
                  selected ? "border-brand bg-brand-soft" : "border-line",
                )}
              >
                <span className="flex-1">
                  <span className="block font-semibold text-ink">{u.name}</span>
                  <span className="text-[13px] text-slate">
                    {u.area} ตร.ม. เหลือ {u.unitsLeft} ห้อง
                  </span>
                </span>
                <span className="font-semibold text-ink tabular-nums">฿{formatPrice(u.price)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function PriceSummary({ project: p }: { project: ProjectDetail }) {
  const minUnit = p.unitTypes[0];
  return (
    <div>
      <p className="text-sm text-slate">ราคาเริ่มต้น</p>
      <p className="text-[28px] leading-tight font-semibold tracking-tight text-ink tabular-nums sm:text-[32px]">
        ฿{formatPrice(p.startingPrice)}
      </p>
      {minUnit && (
        <p className="mt-1 text-sm text-slate tabular-nums">
          เฉลี่ย ฿{formatNumber(Math.round(minUnit.price / minUnit.area / 1000) * 1000)} ต่อ ตร.ม. เงินจอง ฿
          {formatNumber(p.reservationFee)}
        </p>
      )}
      {p.promotion && (
        <p className="mt-3 rounded-md bg-brand-soft px-3 py-2.5 text-[13px] text-ink">
          <strong className="font-semibold text-violet-700">{p.promotion.title}</strong>
          <br />
          {p.promotion.detail}
        </p>
      )}
    </div>
  );
}

function ProjectListings({ project }: { project: ProjectDetail }) {
  const { data, isPending, isError, refetch, isFetching } = useQuery(
    propertyQueries.list({ project: project.slug, limit: 3 }),
  );
  if (project.listingCount === 0) return null;
  return (
    <Section id="project-listings" title="ประกาศขายและเช่าในโครงการนี้">
      <p className="-mt-2 mb-5 text-[15px] text-slate">
        ห้องมือสองจากเจ้าของและนายหน้า {project.listingCount} ประกาศ{" "}
        <Link
          href={routes.search({ q: project.name })}
          className="font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          ดูทั้งหมด
        </Link>
      </p>
      {isPending ? (
        <CardGridSkeleton count={3} columns={3} label="กำลังโหลดประกาศในโครงการ" className="lg:grid-cols-3" />
      ) : isError ? (
        <QueryError what="ประกาศในโครงการ" onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.data.map((p) => (
            <li key={p.id} className="flex">
              <PropertyCard property={p} sizes="(min-width: 1280px) 260px, 50vw" className="w-full" />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function NearbyProjects({ project }: { project: ProjectDetail }) {
  const { data, isPending, isError, refetch, isFetching } = useQuery(projectQueries.nearby(project.slug, 3));
  const projects = data?.data ?? [];
  if (!isPending && !isError && projects.length === 0) return null;
  return (
    <section aria-labelledby="nearby-projects" className="border-t border-line bg-mist py-14 sm:py-16">
      <Container>
        <h2 id="nearby-projects" className="text-[22px] font-semibold text-ink">
          โครงการใกล้เคียง
        </h2>
        <p className="mt-1 text-[15px] text-slate">ในรัศมี 5 กม. เรียงจากใกล้ไปไกล</p>
        {isPending ? (
          <CardGridSkeleton count={3} columns={3} label="กำลังโหลดโครงการใกล้เคียง" className="mt-6" />
        ) : isError ? (
          <QueryError what="โครงการใกล้เคียง" onRetry={() => refetch()} retrying={isFetching} className="mt-6" />
        ) : (
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li key={p.id} className="flex">
                <ProjectCard project={p} distance={p.distance} className="w-full" />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}

function NotFoundPanel() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-start justify-center gap-5 py-20">
      <Building2 className="size-10 text-brand" aria-hidden="true" />
      <div>
        <h1 className="text-[28px] font-semibold text-ink">ไม่พบโครงการนี้</h1>
        <p className="mt-2 max-w-[52ch] text-[16px] text-slate">ลิงก์อาจไม่ถูกต้อง หรือโครงการถูกนำออกจากระบบแล้ว</p>
      </div>
      <Button asChild size="lg">
        <Link href={routes.newProjects}>ดูโครงการใหม่ทั้งหมด</Link>
      </Button>
    </Container>
  );
}

export function ProjectDetailView() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isPending, isError, error, refetch, isFetching } = useQuery(projectQueries.detail(slug));
  const project = data?.data;
  const [unitTypeId, setUnitTypeId] = useState<string>();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (project) document.title = `${project.name} | PropertyHub`;
  }, [project]);

  if (isPending) return <ProjectDetailSkeleton />;
  if (isError && error instanceof ApiError && error.status === 404) return <NotFoundPanel />;
  if (isError || !project) {
    return (
      <Container className="py-16">
        <QueryError what="โครงการ" onRetry={() => refetch()} retrying={isFetching} />
      </Container>
    );
  }

  const tel = `tel:${project.salesPhone.replace(/\D/g, "")}`;

  /** Picking a plan in the table pre-fills the form; on phones it opens the booking sheet. */
  const pickUnit = (id: string) => {
    setUnitTypeId(id);
    if (window.matchMedia("(min-width: 1024px)").matches) {
      document.getElementById("book")?.scrollIntoView({ block: "nearest" });
    } else {
      setSheetOpen(true);
    }
  };

  return (
    <>
      <Container className="pt-5 pb-28 lg:pb-16">
        <Breadcrumb project={project} />
        <div className="mt-5">
          <ProjectGallery project={project} />
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          <article aria-labelledby="project-title" className="flex min-w-0 flex-col gap-8">
            <header className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    <ProjectStatusTag
                      status={project.status}
                      label={project.status === "pre-sale" ? "เปิดจองรอบแรก" : undefined}
                    />
                    <span className="inline-flex h-[26px] items-center rounded-sm bg-mist px-2.5 text-[13px] font-medium text-ink">
                      {propertyTypeLabels[project.type]}
                    </span>
                  </div>
                  <h1
                    id="project-title"
                    className="text-[26px] leading-tight font-semibold tracking-[-0.015em] text-ink sm:text-[34px]"
                  >
                    {project.name}
                  </h1>
                  <p className="text-[15px] text-slate">
                    {project.district.replace(",", " ")}{" "}
                    <a href="#location" className="font-medium text-brand-strong underline-offset-4 hover:underline">
                      ดูแผนที่
                    </a>
                  </p>
                  <p className="text-[15px] text-ink">
                    โดย <span className="font-medium text-brand-strong">{project.developer}</span>{" "}
                    <span className="text-slate">({project.developerProjects} โครงการ)</span>
                  </p>
                </div>
                <ShareMenu title={project.name} label="แชร์โครงการนี้" />
              </div>
              <div className="lg:hidden">
                <PriceSummary project={project} />
              </div>
            </header>

            <KeyFacts project={project} />

            <Section id="progress-title" title="ความคืบหน้าการก่อสร้าง">
              <p className="-mt-2 mb-5 text-sm text-slate">
                อัปเดตโดยผู้พัฒนาโครงการ {formatThaiDate(project.progressUpdatedAt)}
              </p>
              <Milestones milestones={project.milestones} />
            </Section>

            <Section id="units-title" title="แบบห้องและราคา">
              <UnitTypes units={project.unitTypes} selectedId={unitTypeId} onSelect={pickUnit} />
              <p className="mt-3 text-[13px] text-slate">
                ราคาและจำนวนห้องอาจเปลี่ยนแปลง ตรวจสอบกับฝ่ายขายของโครงการก่อนจอง
              </p>
            </Section>

            <Section id="about-title" title="รายละเอียดโครงการ">
              <p className="max-w-[68ch] text-[16px] leading-[1.8] whitespace-pre-line text-ink">
                {project.description}
              </p>
            </Section>

            <Section id="facilities-title" title="สิ่งอำนวยความสะดวก">
              <AmenityList ids={project.facilities} label="ส่วนกลางโครงการ" />
            </Section>

            <Section id="location-title" title="ทำเลและการเดินทาง">
              <div id="location" className="flex scroll-mt-28 flex-col gap-6">
                <StationRoutes stations={project.location.stations} />
                <LocationMap location={project.location} title={project.name} />
              </div>
            </Section>

            <ProjectListings project={project} />
          </article>

          <aside aria-label="ติดต่อโครงการ" className="hidden lg:block">
            <div className="sticky top-[88px] flex flex-col gap-3">
              <div id="book" className="scroll-mt-24 rounded-xl border border-line p-6">
                <PriceSummary project={project} />
                <h2 className="mt-6 mb-4 text-lg font-semibold text-ink">นัดชมห้องตัวอย่าง</h2>
                <ViewingForm project={project} unitTypeId={unitTypeId} onUnitTypeChange={setUnitTypeId} />
              </div>
              <Button asChild variant="outline" size="lg">
                <a href={tel}>
                  <Phone aria-hidden="true" />
                  โทรหาฝ่ายขายโครงการ {project.salesPhone}
                </a>
              </Button>
            </div>
          </aside>
        </div>
      </Container>

      <NearbyProjects project={project} />

      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2.5 border-t border-line bg-white px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
        <Button asChild variant="outline" size="lg" className="w-[52px] px-0">
          <a href={tel} aria-label={`โทรหาฝ่ายขายโครงการ ${project.salesPhone}`}>
            <Phone aria-hidden="true" />
          </a>
        </Button>
        <Button size="lg" className="flex-1 font-semibold" onClick={() => setSheetOpen(true)}>
          นัดชมห้องตัวอย่าง
        </Button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" closeLabel="ปิด" aria-describedby="book-sheet-desc">
          <div className="border-b border-line px-5 py-4 pr-16">
            <SheetTitle className="text-lg font-semibold text-ink">นัดชมห้องตัวอย่าง</SheetTitle>
            <SheetDescription id="book-sheet-desc" className="text-sm text-slate">
              {project.name}
            </SheetDescription>
          </div>
          <div className="overflow-y-auto px-5 py-5">
            <ViewingForm project={project} unitTypeId={unitTypeId} onUnitTypeChange={setUnitTypeId} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <Container className="pt-5 pb-16">
      <div role="status" aria-label="กำลังโหลดโครงการ">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="mt-5 aspect-[4/3] w-full rounded-lg sm:aspect-[16/10] lg:aspect-auto lg:h-[440px]" />
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-3/5" />
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="mt-4 h-24 w-full rounded-lg" />
            <Skeleton className="mt-4 h-64 w-full rounded-lg" />
          </div>
          <Skeleton className="hidden h-[520px] w-full rounded-xl lg:block" />
        </div>
      </div>
    </Container>
  );
}

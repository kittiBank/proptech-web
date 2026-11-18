import Link from "next/link";
import { MapPin } from "lucide-react";
import { PropertyPhoto } from "@/components/property/property-photo";
import { TransitBadge } from "@/components/property/transit-badge";
import { cardImageZoom, cardLink, cardTitle, interactiveCard } from "@/components/ui/card";
import { propertyTypeLabels } from "@/data/catalog";
import { routes } from "@/data/navigation";
import { projectStatusLabels } from "@/data/projects";
import { formatNumber, formatPrice } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import { toBuddhistYear } from "@/lib/listing";
import { cn } from "@/lib/utils";
import type { NewProject, ProjectStatus } from "@/types/property";

const statusTone: Record<ProjectStatus, string> = {
  "pre-sale": "bg-brand text-white",
  "under-construction": "bg-white text-ink",
  ready: "bg-success text-white",
};

/** Status tag in the photo's top-left corner (or inline with `inline`). */
export function ProjectStatusTag({
  status,
  label,
  className,
}: {
  status: ProjectStatus;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[26px] items-center rounded-sm px-2.5 text-[13px] font-semibold",
        statusTone[status],
        status === "under-construction" && "ring-1 ring-line",
        className,
      )}
    >
      {label ?? projectStatusLabels[status]}
    </span>
  );
}

export function projectProgress(project: Pick<NewProject, "status" | "progress">): { value: number; label: string } {
  if (project.status === "ready") return { value: 100, label: "สร้างเสร็จแล้ว" };
  if (project.status === "pre-sale" || !project.progress) return { value: 0, label: "ยังไม่เริ่มก่อสร้าง" };
  return { value: project.progress, label: `ก่อสร้าง ${project.progress}%` };
}

export function ProjectProgressBar({ project }: { project: NewProject }) {
  const { value, label } = projectProgress(project);
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[13px]">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-slate">เสร็จ พ.ศ. {toBuddhistYear(project.completionYear)}</span>
      </div>
      <div
        role="progressbar"
        aria-label={`ความคืบหน้าก่อสร้าง ${project.name}`}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/** "34–98 ตร.ม." for condos, "60–95 ตร.ว." of land for houses. */
export function formatSizeRange({ min, max, unit }: NewProject["sizeRange"]): string {
  return `${min}–${max} ${unit === "sqm" ? "ตร.ม." : "ตร.ว."}`;
}

export function ProjectLocation({ project, className }: { project: NewProject; className?: string }) {
  return project.station ? (
    <TransitBadge station={project.station} distance={project.stationDistance} className={className} />
  ) : (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-slate", className)}>
      <MapPin className="size-4 text-brand" aria-hidden="true" />
      {project.district}
    </span>
  );
}

interface ProjectCardProps {
  project: NewProject;
  sizes?: string;
  priority?: boolean;
  /** Straight-line distance from the project being viewed, in metres. */
  distance?: number;
  className?: string;
}

/** Project card from A5: photo with status, developer, station, price, progress and key counts. */
export function ProjectCard({ project, sizes, priority, distance, className }: ProjectCardProps) {
  return (
    <article className={cn(interactiveCard, className)}>
      <div className="relative">
        <PropertyPhoto
          image={project.image}
          sizes={sizes ?? "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"}
          priority={priority}
          className="aspect-[4/3]"
          imageClassName={cardImageZoom}
        />
        <ProjectStatusTag status={project.status} className="absolute top-3 left-3" />
      </div>
      <div className="flex flex-1 flex-col gap-2 px-5 pt-[18px] pb-5">
        <p className="text-[13px] text-slate">
          {propertyTypeLabels[project.type]} โดย {project.developer}
        </p>
        <h3 className={cn("text-[19px] leading-snug font-semibold text-ink", cardTitle)}>
          <Link href={routes.project(project.slug)} data-card-link className={cardLink}>
            {project.name}
          </Link>
        </h3>
        <ProjectLocation project={project} />
        <p className="mt-0.5 text-[15px] text-ink">
          เริ่ม <span className="text-xl font-semibold tabular-nums">฿{formatPrice(project.startingPrice)}</span>
          {distance !== undefined && <span className="text-sm text-slate"> ห่าง {formatDistance(distance)}</span>}
        </p>
        <ProjectProgressBar project={project} />
        <dl className="mt-auto grid grid-cols-3 border-t border-line pt-3 text-[13px] text-slate">
          <div>
            <dt>ยูนิต</dt>
            <dd className="text-[15px] font-semibold text-ink tabular-nums">{formatNumber(project.units)}</dd>
          </div>
          <div>
            <dt>ขนาด</dt>
            <dd className="text-[15px] font-semibold text-ink tabular-nums">{formatSizeRange(project.sizeRange)}</dd>
          </div>
          <div>
            <dt>เหลือขาย</dt>
            <dd className="text-[15px] font-semibold text-ink tabular-nums">{formatNumber(project.unitsLeft)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

/** Wide featured card at the top of /projects. */
export function FeaturedProjectCard({ project }: { project: NewProject }) {
  return (
    <article className={cn(interactiveCard, "grid lg:grid-cols-[1.35fr_1fr]")}>
      <div className="relative">
        <PropertyPhoto
          image={project.image}
          sizes="(min-width: 1024px) 700px, 100vw"
          priority
          className="aspect-[4/3] h-full lg:aspect-auto lg:min-h-[380px]"
          imageClassName={cardImageZoom}
        />
        <ProjectStatusTag
          status={project.status}
          label={project.status === "pre-sale" ? "เปิดจองรอบแรก" : undefined}
          className="absolute top-3 left-3"
        />
      </div>
      <div className="flex flex-col gap-3.5 p-6 sm:p-8">
        <p className="text-sm text-slate">
          {propertyTypeLabels[project.type]} โดย {project.developer}
        </p>
        <h2
          className={cn(
            "text-[26px] leading-tight font-semibold tracking-[-0.015em] text-ink sm:text-[30px]",
            cardTitle,
          )}
        >
          <Link href={routes.project(project.slug)} data-card-link className={cardLink}>
            {project.name}
          </Link>
        </h2>
        <p className="text-[16px] leading-relaxed text-slate">{project.summary}</p>
        <ProjectLocation project={project} />
        <p className="mt-1 text-[15px] text-ink">
          ราคาเริ่มต้น{" "}
          <span className="text-[30px] font-semibold tracking-tight tabular-nums">
            ฿{formatPrice(project.startingPrice)}
          </span>
        </p>
        <dl className="grid grid-cols-3 border-t border-line pt-4 text-[13px] text-slate">
          <div>
            <dt>ยูนิต</dt>
            <dd className="text-[15px] font-semibold text-ink tabular-nums">{formatNumber(project.units)}</dd>
          </div>
          <div>
            <dt>ขนาด</dt>
            <dd className="text-[15px] font-semibold text-ink tabular-nums">{formatSizeRange(project.sizeRange)}</dd>
          </div>
          <div>
            <dt>คาดว่าเสร็จ</dt>
            <dd className="text-[15px] font-semibold text-ink tabular-nums">
              พ.ศ. {toBuddhistYear(project.completionYear)}
            </dd>
          </div>
        </dl>
        <span
          aria-hidden="true"
          className="mt-1.5 inline-flex h-11 items-center self-start rounded-md bg-ink px-4 text-[15px] font-medium text-white"
        >
          ดูรายละเอียดโครงการ
        </span>
      </div>
    </article>
  );
}

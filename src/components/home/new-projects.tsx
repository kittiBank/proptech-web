"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PropertyPhoto } from "@/components/property/property-photo";
import { propertyTypeLabels } from "@/data/catalog";
import { routes } from "@/data/navigation";
import { formatPrice } from "@/lib/format";
import { cardImageZoom, cardLink, cardTitle, interactiveCard } from "@/components/ui/card";
import { CardGridSkeleton, QueryError } from "@/components/ui/query-state";
import { projectQueries } from "@/lib/api/queries";
import { cn } from "@/lib/utils";
import type { NewProject, ProjectStatus } from "@/types/property";
import { Container, SectionHeader } from "./section-header";

const statusLabel: Record<ProjectStatus, string> = {
  ready: "พร้อมโอน",
  "under-construction": "กำลังก่อสร้าง",
  "pre-sale": "เปิดจอง",
};

function ProjectStatusBar({ project }: { project: NewProject }) {
  const value = project.status === "ready" ? 100 : project.status === "pre-sale" ? 0 : (project.progress ?? 0);
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className={cn("font-medium", project.status === "ready" ? "text-brand-strong" : "text-ink")}>
          {statusLabel[project.status]}
          {project.status === "under-construction" && ` ${value}%`}
        </span>
        <span className="text-slate">เสร็จปี {project.completionYear + 543}</span>
      </div>
      <div
        className="mt-2 h-1 w-full rounded-full bg-line"
        role="progressbar"
        aria-label={`ความคืบหน้าการก่อสร้าง ${project.name}`}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function NewProjects() {
  const { data, isPending, isError, refetch, isFetching } = useQuery(projectQueries.list({ status: "new" }));
  const projects = data?.data ?? [];

  return (
    <section id="projects" aria-labelledby="projects-title" className="py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionHeader
          id="projects-title"
          title="โครงการใหม่จากผู้พัฒนา"
          description="ราคาเริ่มต้นและความคืบหน้าก่อสร้างอัปเดตจากผู้พัฒนาโครงการโดยตรง"
          action={{ label: "ดูโครงการใหม่ทั้งหมด", href: routes.newProjects }}
        />

        {isPending ? (
          <CardGridSkeleton count={4} label="กำลังโหลดโครงการใหม่" imageClassName="aspect-[4/5]" className="mt-10" />
        ) : isError ? (
          <QueryError what="โครงการใหม่" onRetry={() => refetch()} retrying={isFetching} className="mt-10" />
        ) : projects.length === 0 ? (
          <p className="mt-10 text-[15px] text-slate">ยังไม่มีโครงการใหม่ในขณะนี้</p>
        ) : (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {projects.map((project) => (
              <li key={project.id} className={interactiveCard}>
                <PropertyPhoto
                  image={project.image}
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="aspect-[4/5]"
                  imageClassName={cardImageZoom}
                />
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <p className="text-sm text-slate">
                    {propertyTypeLabels[project.type]} โดย {project.developer}
                  </p>
                  <h3 className={cn("text-xl leading-tight font-semibold text-ink", cardTitle)}>
                    <Link href={routes.project(project.slug)} data-card-link className={cardLink}>
                      {project.name}
                    </Link>
                  </h3>
                  <p className="text-[15px] leading-relaxed text-slate">{project.summary}</p>
                  <p className="text-[15px] text-ink">
                    เริ่ม{" "}
                    <span className="text-lg font-semibold tabular-nums">฿{formatPrice(project.startingPrice)}</span>
                    <span className="text-slate"> ใน{project.district}</span>
                  </p>
                  <div className="mt-auto pt-2">
                    <ProjectStatusBar project={project} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}

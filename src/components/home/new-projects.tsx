import Link from "next/link";
import { PropertyPhoto } from "@/components/property/property-photo";
import { propertyTypeLabels } from "@/data/catalog";
import { routes } from "@/data/navigation";
import { formatPrice } from "@/lib/format";
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

export function NewProjects({ projects }: { projects: NewProject[] }) {
  return (
    <section id="projects" aria-labelledby="projects-title" className="py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionHeader
          id="projects-title"
          title="โครงการใหม่จากผู้พัฒนา"
          description="ราคาเริ่มต้นและความคืบหน้าก่อสร้างอัปเดตจากผู้พัฒนาโครงการโดยตรง"
          action={{ label: "ดูโครงการใหม่ทั้งหมด", href: routes.newProjects }}
        />

        <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {projects.map((project) => (
            <li key={project.id} className="relative flex flex-col">
              <PropertyPhoto
                image={project.image}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="aspect-[4/5] rounded-md"
              />
              <div className="flex flex-1 flex-col gap-3 pt-5">
                <p className="text-sm text-slate">
                  {propertyTypeLabels[project.type]} โดย {project.developer}
                </p>
                <h3 className="text-xl leading-tight font-semibold text-ink">
                  <Link
                    href={routes.project(project.slug)}
                    className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-md focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-brand"
                  >
                    {project.name}
                  </Link>
                </h3>
                <p className="text-[15px] leading-relaxed text-slate">{project.summary}</p>
                <p className="text-[15px] text-ink">
                  เริ่ม <span className="text-lg font-semibold tabular-nums">฿{formatPrice(project.startingPrice)}</span>
                  <span className="text-slate"> ใน{project.district}</span>
                </p>
                <div className="mt-auto pt-2">
                  <ProjectStatusBar project={project} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

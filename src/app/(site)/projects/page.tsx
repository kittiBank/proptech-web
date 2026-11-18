import { Suspense } from "react";
import type { Metadata } from "next";
import { ProjectsSkeleton, ProjectsView } from "@/components/project/projects-view";

export const metadata: Metadata = {
  title: "โครงการใหม่",
  description:
    "โครงการคอนโด บ้านเดี่ยว และทาวน์โฮมใหม่ในกรุงเทพฯ และปริมณฑล ราคาเริ่มต้น แบบห้อง และความคืบหน้าก่อสร้าง",
};

/**
 * New developer projects. Filters, sort and page live in the query string,
 * read with `useSearchParams` inside Suspense; data comes from `GET /projects`.
 */
export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectsSkeleton />}>
      <ProjectsView />
    </Suspense>
  );
}

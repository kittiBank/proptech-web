import { Suspense } from "react";
import type { Metadata } from "next";
import { ProjectDetailSkeleton, ProjectDetailView } from "@/components/project/project-detail-view";

export const metadata: Metadata = {
  title: "โครงการ",
};

/**
 * Project page. Like the listing page, the view reads the slug with
 * `useParams` and loads `GET /projects/:slug` through TanStack Query.
 */
export default function ProjectPage() {
  return (
    <Suspense fallback={<ProjectDetailSkeleton />}>
      <ProjectDetailView />
    </Suspense>
  );
}

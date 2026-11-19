import { ProjectsSkeleton } from "@/components/project/projects-view";

/** Shown instantly on navigation while the projects list loads. */
export default function Loading() {
  return <ProjectsSkeleton />;
}

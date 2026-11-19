import { PageSkeleton } from "@/components/system/page-skeleton";

/** Shown instantly on navigation between wizard steps. */
export default function Loading() {
  return <PageSkeleton label="กำลังโหลดแบบร่างประกาศ" cards={3} />;
}

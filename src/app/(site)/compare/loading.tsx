import { PageSkeleton } from "@/components/system/page-skeleton";

/** Shown instantly on navigation while the comparison loads. */
export default function Loading() {
  return <PageSkeleton label="กำลังโหลดการเปรียบเทียบ" cards={3} />;
}

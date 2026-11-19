import { PageSkeleton } from "@/components/system/page-skeleton";

/** Shown instantly on navigation while the calculator loads. */
export default function Loading() {
  return <PageSkeleton label="กำลังโหลดเครื่องคำนวณ" cards={2} />;
}

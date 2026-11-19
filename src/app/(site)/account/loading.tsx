import { PageSkeleton } from "@/components/system/page-skeleton";

/** Shown instantly on navigation between account pages. */
export default function Loading() {
  return <PageSkeleton label="กำลังโหลดบัญชีของคุณ" />;
}

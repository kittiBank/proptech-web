import { Container } from "@/components/home/section-header";
import { CardGridSkeleton, Skeleton } from "@/components/ui/query-state";

/** Generic route placeholder (heading + card grid) for pages without a tailored skeleton. */
export function PageSkeleton({ label = "กำลังโหลด", cards = 6 }: { label?: string; cards?: number }) {
  return (
    <Container className="pt-8 pb-16">
      <Skeleton className="h-9 w-2/5 max-w-[360px]" />
      <Skeleton className="mt-3 h-5 w-3/5 max-w-[520px]" />
      <CardGridSkeleton count={cards} columns={3} label={label} className="mt-8" />
    </Container>
  );
}

import { Container } from "@/components/home/section-header";
import { Skeleton } from "@/components/ui/query-state";

/** Page-shaped placeholder while the listing loads. */
export function PropertyDetailSkeleton() {
  return (
    <Container className="pt-5 pb-16">
      <div role="status" aria-label="กำลังโหลดประกาศ">
        <Skeleton className="h-4 w-64" />
        <div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex flex-col gap-6">
            <Skeleton className="aspect-[4/3] w-full rounded-lg sm:aspect-[16/10]" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-[72px] w-[108px]" />
              ))}
            </div>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-9 w-4/5" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <Skeleton className="h-[420px] w-full rounded-lg" />
        </div>
      </div>
    </Container>
  );
}

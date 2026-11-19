import Link from "next/link";
import { PropertyPhoto } from "@/components/property/property-photo";
import { Skeleton } from "@/components/ui/query-state";
import { articleCategoryLabels } from "@/data/articles";
import { routes } from "@/data/navigation";
import { formatThaiDate } from "@/lib/listing";
import type { ArticleSummaryDto } from "@/types/api";

/** "อ่าน 8 นาที · 12 พ.ย. 2569" */
export function articleMeta(article: Pick<ArticleSummaryDto, "readingMinutes" | "publishedAt">): string {
  return `อ่าน ${article.readingMinutes} นาที · ${formatThaiDate(article.publishedAt)}`;
}

/** D1 grid card: cover, category, title, reading time and date. */
export function ArticleCard({ article }: { article: ArticleSummaryDto }) {
  return (
    <article className="group relative flex flex-col gap-2">
      <PropertyPhoto
        image={article.cover}
        sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
        className="aspect-[16/9] rounded-lg"
        imageClassName="transition-transform duration-300 group-hover:scale-[1.03]"
      />
      <p className="mt-1 text-[13px] font-medium text-brand-strong">{articleCategoryLabels[article.category]}</p>
      <h3 className="text-lg leading-snug font-semibold text-ink">
        <Link href={routes.guide(article.slug)} className="group-hover:underline after:absolute after:inset-0">
          {article.title}
        </Link>
      </h3>
      <p className="text-[13px] text-slate">{articleMeta(article)}</p>
    </article>
  );
}

/** D1 featured article: large cover beside the headline. */
export function FeaturedArticle({ article }: { article: ArticleSummaryDto }) {
  return (
    <article className="group relative grid items-center gap-5 md:grid-cols-[1.3fr_1fr] md:gap-8">
      <PropertyPhoto
        image={article.cover}
        sizes="(min-width: 768px) 700px, 100vw"
        priority
        className="aspect-[16/10] rounded-xl md:aspect-auto md:h-[340px]"
      />
      <div>
        <p className="text-[13px] font-semibold text-brand-strong">
          {articleCategoryLabels[article.category]} · บทความเด่น
        </p>
        <h2 className="mt-2 text-[24px] leading-tight font-semibold tracking-[-0.015em] text-ink sm:text-[30px]">
          <Link href={routes.guide(article.slug)} className="group-hover:underline after:absolute after:inset-0">
            {article.title}
          </Link>
        </h2>
        <p className="mt-2.5 text-[16px] text-slate">{article.excerpt}</p>
        <p className="mt-3.5 text-sm text-slate">
          โดย {article.author} · อ่าน {article.readingMinutes} นาที
        </p>
      </div>
    </article>
  );
}

export function ArticleGridSkeleton({ count }: { count: number }) {
  return (
    <div role="status" aria-label="กำลังโหลดบทความ" className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-2.5">
          <Skeleton className="aspect-[16/9] rounded-lg" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      ))}
    </div>
  );
}

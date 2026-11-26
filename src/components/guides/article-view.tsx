"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, FileQuestion, Printer, TriangleAlert } from "lucide-react";
import { Container } from "@/components/home/section-header";
import { ShareMenu } from "@/components/listing/share-menu";
import { PropertyPhoto } from "@/components/property/property-photo";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { articleCategoryLabels } from "@/data/articles";
import { priceRanges } from "@/data/catalog";
import { routes } from "@/data/navigation";
import { ApiError } from "@/lib/api/client";
import { articleQueries, propertyQueries } from "@/lib/api/queries";
import { formatListingPrice, formatNumber } from "@/lib/format";
import { formatThaiDate } from "@/lib/listing";
import { cn } from "@/lib/utils";
import type { ArticleBlock, ArticleDetailDto, ArticleRelatedListings } from "@/types/api";
import { InlineCalculator } from "./inline-calculator";

type Heading = Extract<ArticleBlock, { type: "heading" }>;

/** 0–1: how far the reader has scrolled through `ref`. */
function useReadingProgress(ref: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const { top, height } = el.getBoundingClientRect();
      const scrollable = height - window.innerHeight;
      setProgress(scrollable <= 0 ? 1 : Math.min(1, Math.max(0, -top / scrollable)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref]);
  return progress;
}

/** Id of the last heading that has scrolled past the top third of the viewport. */
function useActiveHeading(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join(",");
  useEffect(() => {
    const list = key ? key.split(",") : [];
    const onScroll = () => {
      const line = window.innerHeight / 3;
      let current = list[0];
      for (const id of list) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [key]);
  return active;
}

/** The /search bracket that exactly matches the related-listings filter, if any. */
function searchHrefFor({ query }: ArticleRelatedListings): string {
  const mode = query.mode ?? "buy";
  const bracket = priceRanges[mode].find(
    (r) => r.value !== "any" && r.min === query.minPrice && r.max === query.maxPrice,
  );
  return routes.search({ mode, type: query.type, station: query.station, price: bracket?.value });
}

function RelatedListings({ related }: { related: ArticleRelatedListings }) {
  const { data, isPending, isError } = useQuery(
    propertyQueries.list({ ...related.query, sort: "-postedAt", limit: 3 }),
  );
  // A side panel: if it fails, the article still reads fine without it.
  if (isError || (data && data.data.length === 0)) return null;

  return (
    <section aria-labelledby="related-title" className="flex flex-col gap-3.5">
      <h2 id="related-title" className="text-[13px] font-semibold text-slate">
        {related.title}
      </h2>
      {isPending ? (
        <div role="status" aria-label="กำลังโหลดประกาศ" className="flex flex-col gap-3.5">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex gap-2.5">
              <Skeleton className="h-16 w-[84px] shrink-0" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-2/5" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {data.data.map((p) => (
            <li key={p.id}>
              <Link href={routes.property(p.slug)} className="group flex gap-2.5 text-ink">
                <PropertyPhoto image={p.image} sizes="84px" className="h-16 w-[84px] shrink-0 rounded-md" />
                <span className="min-w-0 text-sm">
                  <b className="line-clamp-2 leading-snug font-semibold group-hover:underline">{p.title}</b>
                  <span className="tabular-nums">{formatListingPrice(p.price, p.mode)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {data && (
        <Button asChild variant="outline" size="base">
          <Link href={searchHrefFor(related)}>ดูทั้งหมด {formatNumber(data.meta.total)} ประกาศ</Link>
        </Button>
      )}
    </section>
  );
}

function ArticleCallout({ block }: { block: Extract<ArticleBlock, { type: "callout" }> }) {
  return (
    <Callout
      tone={block.tone === "warning" ? "warning" : "info"}
      icon={block.tone === "warning" ? TriangleAlert : undefined}
      title={block.title}
      className="my-6"
    >
      <p>{block.text}</p>
    </Callout>
  );
}

/** Inline listing cards (E9 "การ์ดประกาศ"). Quietly absent when nothing matches or the request fails. */
function ListingsBlock({ block }: { block: Extract<ArticleBlock, { type: "listings" }> }) {
  const { data, isPending, isError } = useQuery(
    propertyQueries.list({ ...block.query, sort: "-postedAt", limit: block.limit }),
  );
  if (isError || (data && data.data.length === 0)) return null;
  return (
    <section aria-label={block.title} className="my-7 rounded-lg border border-line bg-mist p-4">
      <p className="mb-3 text-[15px] font-semibold">{block.title}</p>
      {isPending ? (
        <div role="status" aria-label="กำลังโหลดประกาศ" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: block.limit }, (_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {data.data.map((p) => (
            <li key={p.id}>
              <Link href={routes.property(p.slug)} className="group flex flex-col gap-1.5 text-ink">
                <PropertyPhoto
                  image={p.image}
                  sizes="(min-width: 640px) 220px, 100vw"
                  className="aspect-[4/3] rounded-md"
                />
                <b className="line-clamp-2 text-[15px] leading-snug font-semibold group-hover:underline">{p.title}</b>
                <span className="text-sm tabular-nums">{formatListingPrice(p.price, p.mode)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Renders article blocks; the CMS preview (E9) uses it too. */
export function ArticleBody({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="text-[17px] leading-[1.85] text-ink">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={i} className="mb-[18px]">
                {block.text}
              </p>
            );
          case "heading":
            return (
              <h2
                key={i}
                id={block.id}
                className="mt-9 mb-3 scroll-mt-24 text-[21px] leading-snug font-semibold sm:text-[26px]"
              >
                {block.text}
              </h2>
            );
          case "list":
            return (
              <ul key={i} className="mb-[18px] list-disc pl-6 marker:text-brand">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          case "callout":
            return <ArticleCallout key={i} block={block} />;
          case "calculator":
            return <InlineCalculator key={i} {...block} />;
          case "subheading":
            return (
              <h3 key={i} className="mt-6 mb-2 text-[19px] leading-snug font-semibold">
                {block.text}
              </h3>
            );
          case "image":
            return (
              <figure key={i} className="my-7">
                <PropertyPhoto
                  image={block}
                  sizes="(min-width: 768px) 720px, 100vw"
                  className="aspect-[16/9] rounded-lg"
                />
                {block.caption && <figcaption className="mt-2 text-sm text-slate">{block.caption}</figcaption>}
              </figure>
            );
          case "listings":
            return <ListingsBlock key={i} block={block} />;
        }
      })}
    </div>
  );
}

function TableOfContents({ headings, active }: { headings: Heading[]; active: string | undefined }) {
  return (
    <ol className="flex flex-col">
      {headings.map((h) => (
        <li key={h.id}>
          <a
            href={`#${h.id}`}
            aria-current={active === h.id ? "location" : undefined}
            className={cn(
              "block border-l-2 py-1.5 pl-3 text-sm transition-colors",
              active === h.id
                ? "border-brand font-semibold text-ink"
                : "border-line text-slate hover:border-line-strong hover:text-ink",
            )}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

function Feedback() {
  const [answer, setAnswer] = useState<"yes" | "no">();
  return (
    <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6 sm:gap-4">
      {answer ? (
        <p role="status" className="font-medium text-ink">
          {answer === "yes" ? "ขอบคุณ ดีใจที่บทความนี้ช่วยได้" : "ขอบคุณสำหรับความเห็น เราจะปรับปรุงบทความนี้"}
        </p>
      ) : (
        <>
          <p className="flex-1 font-semibold text-ink">บทความนี้ช่วยได้ไหม</p>
          <Button variant="outline" onClick={() => setAnswer("yes")}>
            ช่วยได้
          </Button>
          <Button variant="outline" onClick={() => setAnswer("no")}>
            ยังไม่ช่วย
          </Button>
        </>
      )}
    </div>
  );
}

function Article({ article }: { article: ArticleDetailDto }) {
  const articleRef = useRef<HTMLElement>(null);
  const progress = useReadingProgress(articleRef);
  const headings = article.body.filter((b): b is Heading => b.type === "heading");
  const active = useActiveHeading(headings.map((h) => h.id));
  const category = articleCategoryLabels[article.category];

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-brand print:hidden"
        style={{ transform: `scaleX(${progress})` }}
      />
      <Container className="pt-6 pb-16 sm:pt-8">
        <nav aria-label="เส้นทางหน้า">
          <ol className="flex items-center gap-1.5 text-sm text-slate">
            <li className="flex items-center gap-1.5">
              <Link href={routes.guides} className="text-brand-strong hover:underline">
                บทความ & คู่มือ
              </Link>
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </li>
            <li>
              <Link href={`${routes.guides}?category=${article.category}`} className="hover:text-ink hover:underline">
                {category}
              </Link>
            </li>
          </ol>
        </nav>

        <div className="mt-5 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[200px_minmax(0,720px)_280px] xl:gap-12">
          {headings.length > 0 && (
            <nav aria-label="สารบัญ" className="sticky top-6 hidden xl:block print:hidden">
              <p className="mb-2 text-[13px] font-semibold text-slate">ในบทความนี้</p>
              <TableOfContents headings={headings} active={active} />
              <div className="mt-5 flex gap-2">
                <ShareMenu title={article.title} label="แชร์บทความนี้" />
                <Button variant="outline" size="icon" aria-label="พิมพ์บทความ" onClick={() => window.print()}>
                  <Printer aria-hidden="true" />
                </Button>
              </div>
            </nav>
          )}

          <article ref={articleRef} aria-labelledby="article-title" className="min-w-0">
            <p className="text-[13px] font-semibold text-brand-strong">{category}</p>
            <h1
              id="article-title"
              className="mt-1.5 text-[26px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink sm:text-[40px] sm:leading-[1.25]"
            >
              {article.title}
            </h1>
            <div className="mt-3.5 flex items-center gap-2.5 text-sm text-slate">
              <span
                aria-hidden="true"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-white"
              >
                {article.author.charAt(0)}
              </span>
              <p className="min-w-0 flex-1">
                {[
                  article.author,
                  article.reviewedBy,
                  `อัปเดต ${formatThaiDate(article.updatedAt)}`,
                  `อ่าน ${article.readingMinutes} นาที`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <ShareMenu title={article.title} label="แชร์บทความนี้" className="xl:hidden" />
            </div>

            <figure className="mt-6 mb-7">
              <PropertyPhoto
                image={article.cover}
                sizes="(min-width: 1280px) 720px, (min-width: 1024px) 640px, 100vw"
                priority
                className="aspect-[16/9] rounded-xl sm:aspect-[720/380]"
              />
              {article.coverCaption && (
                <figcaption className="mt-2 text-[13px] text-slate">{article.coverCaption}</figcaption>
              )}
            </figure>

            {headings.length > 0 && (
              <details open className="mb-6 rounded-lg border border-line px-4 py-3 xl:hidden print:hidden">
                <summary className="cursor-pointer text-sm font-semibold text-ink">
                  ในบทความนี้ ({headings.length} หัวข้อ)
                </summary>
                <div className="mt-2">
                  <TableOfContents headings={headings} active={active} />
                </div>
              </details>
            )}

            <ArticleBody blocks={article.body} />
            <Feedback />
          </article>

          {article.related && (
            <aside className="sticky top-6 print:hidden" aria-label="ประกาศที่เกี่ยวข้อง">
              <RelatedListings related={article.related} />
            </aside>
          )}
        </div>
      </Container>
    </>
  );
}

function NotFoundPanel() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-start justify-center gap-5 py-20">
      <FileQuestion className="size-10 text-brand" aria-hidden="true" />
      <div>
        <h1 className="text-[28px] font-semibold text-ink">ไม่พบบทความนี้</h1>
        <p className="mt-2 max-w-[52ch] text-[16px] text-slate">ลิงก์อาจไม่ถูกต้อง หรือบทความถูกนำออกแล้ว</p>
      </div>
      <Button asChild size="lg">
        <Link href={routes.guides}>ดูบทความทั้งหมด</Link>
      </Button>
    </Container>
  );
}

export function ArticleSkeleton() {
  return (
    <Container className="pt-8 pb-16">
      <span className="sr-only" role="status">
        กำลังโหลดบทความ
      </span>
      <Skeleton className="h-4 w-48" />
      <div className="mt-5 max-w-[720px] xl:ml-[248px]">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-10 w-full" />
        <Skeleton className="mt-2 h-10 w-3/5" />
        <Skeleton className="mt-6 aspect-[16/9] w-full rounded-xl" />
        <div className="mt-7 flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </Container>
  );
}

export function ArticleView() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isPending, isError, error, refetch, isFetching } = useQuery(articleQueries.detail(slug));
  const article = data?.data;

  useEffect(() => {
    if (article) document.title = `${article.title} | PropertyHub`;
  }, [article]);

  if (isPending) return <ArticleSkeleton />;
  if (isError && error instanceof ApiError && error.status === 404) return <NotFoundPanel />;
  if (isError || !article) {
    return (
      <Container className="py-16">
        <QueryError what="บทความ" onRetry={() => refetch()} retrying={isFetching} />
      </Container>
    );
  }
  return <Article article={article} />;
}

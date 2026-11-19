import { articles } from "@/data/articles";
import {
  ARTICLES_DEFAULT_LIMIT,
  type ArticleDetailDto,
  type ArticleSummaryDto,
  type ListArticlesQuery,
  type ListArticlesResponse,
} from "@/types/api";

/** Card fields only: list responses leave out the body. */
function toSummary({
  slug,
  title,
  excerpt,
  category,
  cover,
  author,
  readingMinutes,
  publishedAt,
  featured,
}: ArticleDetailDto): ArticleSummaryDto {
  return { slug, title, excerpt, category, cover, author, readingMinutes, publishedAt, featured };
}

/** `GET /articles`: filter → newest first → paginate. */
export function queryArticles(query: ListArticlesQuery): ListArticlesResponse {
  const q = query.q?.trim().toLowerCase();
  const matches = articles
    .filter((a) => !query.category || a.category === query.category)
    .filter((a) => query.featured === undefined || a.featured === query.featured)
    .filter((a) => !q || `${a.title} ${a.excerpt}`.toLowerCase().includes(q))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const limit = query.limit ?? ARTICLES_DEFAULT_LIMIT;
  const page = query.page ?? 1;
  const total = matches.length;
  return {
    data: matches.slice((page - 1) * limit, page * limit).map(toSummary),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

/** `GET /articles/:slug` */
export function getArticle(slug: string): ArticleDetailDto | undefined {
  return articles.find((a) => a.slug === slug);
}

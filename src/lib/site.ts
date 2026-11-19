/**
 * Public site identity, used for canonical URLs, Open Graph, the sitemap and JSON-LD.
 * Set NEXT_PUBLIC_SITE_URL in each environment; it is inlined at build time.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");

export const SITE_NAME = "PropertyHub";

export const SITE_DESCRIPTION =
  "ค้นหาบ้าน คอนโด ทาวน์โฮม ที่ดิน และอาคารพาณิชย์กว่า 96,000 ประกาศทั่วกรุงเทพฯ พร้อมระยะเดินถึง BTS และ MRT";

/** Absolute URL for a site path, e.g. "/guides" → "https://…/guides". */
export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Trims text to a meta-description length on a word boundary. */
export function metaDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

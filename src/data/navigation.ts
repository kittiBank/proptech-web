/**
 * Site routes. `/`, `/search`, `/property/[slug]`, `/projects(/[slug])`, `/agents/[slug]`, `/guides(/[slug])` and `/tools/mortgage` are implemented; the rest are reserved paths
 * for upcoming pages and land on the branded not-found page until then.
 */
export const routes = {
  home: "/",
  buy: "/buy",
  rent: "/rent",
  newProjects: "/projects",
  guides: "/guides",
  guide: (slug: string) => `/guides/${slug}`,
  /** Full mortgage calculator; optional params prefill it (see `lib/mortgage.ts`). */
  mortgageTool: "/tools/mortgage",
  /** `next` = where to go after signing in; `intent` = gated action that opened it (modal copy). */
  login: (params: { next?: string; intent?: string } = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
    ).toString();
    return query ? `/login?${query}` : "/login";
  },
  register: (next?: string) => (next ? `/register?next=${encodeURIComponent(next)}` : "/register"),
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  onboarding: "/onboarding",
  postProperty: "/post",
  postStep: (draftId: string, step: string) => `/post/${encodeURIComponent(draftId)}/${step}`,
  postDone: (draftId: string) => `/post/${encodeURIComponent(draftId)}/done`,
  checkout: (orderId: string) => `/checkout/${encodeURIComponent(orderId)}`,
  property: (slug: string) => `/property/${slug}`,
  /** Search results. Params: see `lib/search-params.ts` (mode, q, type, station, price, beds, area, sort, page, view). */
  search: (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams(
      Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
    ).toString();
    return query ? `/search?${query}` : "/search";
  },
  project: (slug: string) => `/projects/${slug}`,
  /** Public agent profile; optional params keep the listing tab, filters and page (see `lib/agent-params.ts`). */
  agent: (slug: string, query = "") => `/agents/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`,
  messages: "/messages",
  thread: (id: string) => `/messages/${encodeURIComponent(id)}`,
  /** Opens (or starts) the chat with an agent or poster. */
  messageTo: (recipient: string) => `/messages?to=${encodeURIComponent(recipient)}`,
  favorites: "/account/favorites",
  account: "/account",
  profile: "/account/profile",
  appointments: "/account/appointments",
  dashboard: "/dashboard",
  savedSearches: "/account/saved-searches",
  notifications: "/notifications",
  /** Side-by-side table for up to 3 listing ids. */
  compare: (ids: string[]) => `/compare?ids=${ids.map(encodeURIComponent).join(",")}`,
  location: (id: string) => `/buy?location=${id}`,
  category: (type: string) => `/buy?type=${type}`,
} as const;

export interface NavItem {
  label: string;
  href: string;
  /** In-page action handled on the homepage instead of navigating. */
  action?: "search-buy" | "search-rent";
}

export const mainNav: NavItem[] = [
  { label: "ซื้อ", href: "/search?mode=buy", action: "search-buy" },
  { label: "เช่า", href: "/search?mode=rent", action: "search-rent" },
  { label: "โครงการใหม่", href: routes.newProjects },
  { label: "บทความ & คู่มือ", href: routes.guides },
];

export const footerNav: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "PropertyHub",
    links: [
      { label: "เกี่ยวกับเรา", href: "/about" },
      { label: "ร่วมงานกับเรา", href: "/careers" },
      { label: "ติดต่อฝ่ายขายโฆษณา", href: "/advertise" },
      { label: "ข่าวสาร", href: "/press" },
    ],
  },
  {
    title: "ค้นหาอสังหาฯ",
    links: [
      { label: "ซื้อบ้านและคอนโด", href: routes.buy },
      { label: "เช่าบ้านและคอนโด", href: routes.rent },
      { label: "โครงการใหม่", href: routes.newProjects },
      { label: "ลงประกาศฟรี", href: routes.postProperty },
    ],
  },
  {
    title: "ช่วยเหลือ",
    links: [
      { label: "ศูนย์ช่วยเหลือ", href: "/help" },
      { label: "คู่มือผู้ซื้อบ้าน", href: routes.guides },
      { label: "แจ้งประกาศไม่เหมาะสม", href: "/help/report" },
      { label: "ข้อกำหนดการใช้งาน", href: "/terms" },
      { label: "นโยบายความเป็นส่วนตัว", href: "/privacy" },
    ],
  },
];

export const contact = {
  phone: "02 000 4567",
  email: "hello@propertyhub.example",
  address: "ชั้น 18 ถนนสาทรใต้ เขตสาทร กรุงเทพฯ 10120",
  hours: "จันทร์–เสาร์ 9:00–18:00",
};

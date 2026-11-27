/** Site routes. Every path here has a page; `/buy` and `/rent` only exist as redirects to `/search` (see `proxy.ts`). */
export const routes = {
  home: "/",
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
  /** Edit mode of the wizard for a published, rejected or expired listing (FE-24). */
  editListing: (listingId: string, step = "type") =>
    `/dashboard/listings/${encodeURIComponent(listingId)}/edit/${step}`,
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
  dashboardListings: "/dashboard/listings",
  dashboardLeads: "/dashboard/leads",
  billing: "/dashboard/billing",
  verify: "/dashboard/verify",
  pricing: "/pricing",
  help: "/help",
  /** Help center filtered to one topic (`helpTopics` in `data/help.ts`), e.g. `safety` for reporting a scam. */
  helpTopic: (topic: string) => `/help?topic=${topic}`,
  /** `privacy`, `terms`, `listing-rules` or `cookies`. */
  legal: (doc: string) => `/legal/${doc}`,
  savedSearches: "/account/saved-searches",
  notifications: "/notifications",
  /** Side-by-side table for up to 3 listing ids. */
  compare: (ids: string[]) => `/compare?ids=${ids.map(encodeURIComponent).join(",")}`,
  /** Search results for one property type (homepage category tiles). */
  category: (type: string) => `/search?mode=buy&type=${type}`,
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

/** Company pages (about, careers, advertise, press) are left out until they exist (FE-23). */
export const footerNav: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "ค้นหาอสังหาฯ",
    links: [
      { label: "ซื้อบ้านและคอนโด", href: "/search?mode=buy" },
      { label: "เช่าบ้านและคอนโด", href: "/search?mode=rent" },
      { label: "โครงการใหม่", href: routes.newProjects },
      { label: "ลงประกาศฟรี", href: routes.postProperty },
    ],
  },
  {
    title: "ช่วยเหลือ",
    links: [
      { label: "ศูนย์ช่วยเหลือ", href: routes.help },
      { label: "คู่มือผู้ซื้อบ้าน", href: routes.guides },
      { label: "แจ้งประกาศไม่เหมาะสม", href: routes.helpTopic("safety") },
      { label: "แพ็กเกจและราคา", href: routes.pricing },
      { label: "ข้อกำหนดการใช้งาน", href: routes.legal("terms") },
      { label: "นโยบายความเป็นส่วนตัว", href: routes.legal("privacy") },
      { label: "กฎการลงประกาศ", href: routes.legal("listing-rules") },
    ],
  },
];

export const contact = {
  phone: "02 000 4567",
  email: "hello@propertyhub.example",
  /** LINE official account, also used for status updates during outages. */
  line: "@propertyhub",
  address: "ชั้น 18 ถนนสาทรใต้ เขตสาทร กรุงเทพฯ 10120",
  hours: "จันทร์–เสาร์ 9:00–18:00",
};

/**
 * Site routes. `/` is the only implemented page; the rest are reserved paths
 * for upcoming pages and land on the branded not-found page until then.
 */
export const routes = {
  home: "/",
  buy: "/buy",
  rent: "/rent",
  newProjects: "/projects",
  guides: "/guides",
  login: "/login",
  postProperty: "/post",
  property: (slug: string) => `/property/${slug}`,
  project: (slug: string) => `/projects/${slug}`,
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
  { label: "ซื้อ", href: "/#search", action: "search-buy" },
  { label: "เช่า", href: "/#search", action: "search-rent" },
  { label: "โครงการใหม่", href: "/#projects" },
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

import type { ListProjectsQuery, ProjectSort } from "@/types/api";
import type { ProjectStatus, ProjectType, TransitLineId } from "@/types/property";

/**
 * State of the /projects page, kept in the query string like /search so a
 * filtered list can be shared and walked through with Back/Forward.
 */
export interface ProjectsState {
  status: ProjectStatus | "all";
  type: ProjectType | "all";
  line: TransitLineId | "all";
  /** A `projectPriceRanges` value. */
  price: string;
  sort: ProjectsSort;
  /** 1-based. */
  page: number;
}

export type ProjectsSort = "newest" | "price-asc" | "price-desc" | "completion";

/** 3 rows of the 3-column grid. */
export const PROJECTS_PAGE_SIZE = 9;

export const projectSortOptions: { value: ProjectsSort; label: string; api: ProjectSort }[] = [
  { value: "newest", label: "เปิดตัวล่าสุด", api: "-launchedAt" },
  { value: "price-asc", label: "ราคาเริ่มต้นต่ำไปสูง", api: "startingPrice" },
  { value: "price-desc", label: "ราคาเริ่มต้นสูงไปต่ำ", api: "-startingPrice" },
  { value: "completion", label: "เสร็จเร็วที่สุด", api: "completionYear" },
];

export const projectStatusTabs: { value: ProjectsState["status"]; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "pre-sale", label: "เปิดจอง" },
  { value: "under-construction", label: "กำลังก่อสร้าง" },
  { value: "ready", label: "พร้อมอยู่" },
];

export const projectTypeOptions: { value: ProjectsState["type"]; label: string }[] = [
  { value: "all", label: "ทุกประเภท" },
  { value: "condo", label: "คอนโด" },
  { value: "house", label: "บ้านเดี่ยว" },
  { value: "townhouse", label: "ทาวน์โฮม" },
];

export const projectLineOptions: { value: ProjectsState["line"]; label: string }[] = [
  { value: "all", label: "ทุกทำเลและสายรถไฟฟ้า" },
  { value: "bts-sukhumvit", label: "BTS สายสุขุมวิท" },
  { value: "bts-silom", label: "BTS สายสีลม" },
  { value: "mrt-blue", label: "MRT สายสีน้ำเงิน" },
];

export const projectPriceRanges: { value: string; label: string; min?: number; max?: number }[] = [
  { value: "any", label: "ทุกราคาเริ่มต้น" },
  { value: "0-3m", label: "ไม่เกิน 3 ล้าน", max: 3_000_000 },
  { value: "3-5m", label: "3 – 5 ล้าน", min: 3_000_000, max: 5_000_000 },
  { value: "5-10m", label: "5 – 10 ล้าน", min: 5_000_000, max: 10_000_000 },
  { value: "10m+", label: "10 ล้านขึ้นไป", min: 10_000_000 },
];

export const defaultProjectsState: ProjectsState = {
  status: "all",
  type: "all",
  line: "all",
  price: "any",
  sort: "newest",
  page: 1,
};

function pick<T extends string>(value: string | null, allowed: readonly { value: T }[], fallback: T): T {
  return allowed.some((o) => o.value === value) ? (value as T) : fallback;
}

/** Reads the state from a query string; unknown or malformed values fall back to defaults. */
export function parseProjectsParams(params: Pick<URLSearchParams, "get">): ProjectsState {
  const page = Number(params.get("page"));
  return {
    status: pick(params.get("status"), projectStatusTabs, "all"),
    type: pick(params.get("type"), projectTypeOptions, "all"),
    line: pick(params.get("line"), projectLineOptions, "all"),
    price: pick(params.get("price"), projectPriceRanges, "any"),
    sort: pick(params.get("sort"), projectSortOptions, "newest"),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** Only non-default values go into the URL, so the plain page stays `/projects`. */
export function toProjectsQueryString(state: ProjectsState): string {
  const params = new URLSearchParams();
  for (const key of ["status", "type", "line", "price", "sort"] as const) {
    if (state[key] !== defaultProjectsState[key]) params.set(key, state[key]);
  }
  if (state.page > 1) params.set("page", String(state.page));
  return params.toString();
}

/** Filter changes go back to page 1; a page change keeps the filters. */
export function updateProjectsState(state: ProjectsState, change: Partial<ProjectsState>): ProjectsState {
  return { ...state, page: 1, ...change };
}

export function hasProjectFilters(state: ProjectsState): boolean {
  return (["status", "type", "line", "price"] as const).some((key) => state[key] !== defaultProjectsState[key]);
}

export function toProjectsQuery(state: ProjectsState): ListProjectsQuery {
  const price = projectPriceRanges.find((r) => r.value === state.price);
  return {
    status: state.status === "all" ? undefined : state.status,
    type: state.type === "all" ? undefined : state.type,
    line: state.line === "all" ? undefined : state.line,
    minPrice: price?.min,
    maxPrice: price?.max,
    sort: projectSortOptions.find((o) => o.value === state.sort)?.api,
    page: state.page,
    limit: PROJECTS_PAGE_SIZE,
  };
}

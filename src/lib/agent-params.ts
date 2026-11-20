import { propertyTypeLabels } from "@/data/catalog";
import { sortOptions, type SearchSort } from "@/lib/search-params";
import type { AgentProfileDto, ListPropertiesQuery } from "@/types/api";
import type { ListingMode, PropertyType } from "@/types/property";

/**
 * Listing section of `/agents/[slug]`: tab, type, sort and page live in the
 * query string so a filtered list can be shared and walked with Back/Forward.
 */
export interface AgentListingsState {
  mode: ListingMode | "all";
  type: PropertyType | "all";
  sort: SearchSort;
  /** 1-based. */
  page: number;
}

/** 4 rows of the 3-column grid. */
export const AGENT_PAGE_SIZE = 12;

export const agentModeTabs: { value: AgentListingsState["mode"]; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "buy", label: "ขาย" },
  { value: "rent", label: "เช่า" },
];

export const agentTypeOptions: { value: AgentListingsState["type"]; label: string }[] = [
  { value: "all", label: "ทุกประเภท" },
  ...(Object.entries(propertyTypeLabels) as [PropertyType, string][]).map(([value, label]) => ({ value, label })),
];

/** "Nearest station" makes little sense across one agent's areas, so it is left out. */
export const agentSortOptions = sortOptions.filter((o) => o.value !== "station");

export const defaultAgentListingsState: AgentListingsState = { mode: "all", type: "all", sort: "newest", page: 1 };

function pick<T extends string>(value: string | null, allowed: readonly { value: T }[], fallback: T): T {
  return allowed.some((o) => o.value === value) ? (value as T) : fallback;
}

export function parseAgentParams(params: Pick<URLSearchParams, "get">): AgentListingsState {
  const page = Number(params.get("page"));
  return {
    mode: pick(params.get("mode"), agentModeTabs, "all"),
    type: pick(params.get("type"), agentTypeOptions, "all"),
    sort: pick(params.get("sort"), agentSortOptions, "newest"),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** Only non-default values, so the plain profile stays `/agents/<slug>`. */
export function toAgentQueryString(state: AgentListingsState): string {
  const params = new URLSearchParams();
  for (const key of ["mode", "type", "sort"] as const) {
    if (state[key] !== defaultAgentListingsState[key]) params.set(key, state[key]);
  }
  if (state.page > 1) params.set("page", String(state.page));
  return params.toString();
}

/** Filter changes go back to page 1; a page change keeps the filters. */
export function updateAgentState(state: AgentListingsState, change: Partial<AgentListingsState>): AgentListingsState {
  return { ...state, page: 1, ...change };
}

export function toAgentListingsQuery(slug: string, state: AgentListingsState): ListPropertiesQuery {
  return {
    agent: slug,
    mode: state.mode === "all" ? undefined : state.mode,
    type: state.type === "all" ? undefined : state.type,
    sort: agentSortOptions.find((o) => o.value === state.sort)?.api,
    page: state.page,
    limit: AGENT_PAGE_SIZE,
  };
}

/** "กิตติพัฒน์ ศรีสุข" → "กิตติพัฒน์" for headings like "ติดต่อกิตติพัฒน์"; agencies keep the full name. */
export const agentShortName = (agent: Pick<AgentProfileDto, "name" | "company">) =>
  agent.company ? agent.name.split(/\s+/)[0] : agent.name;

import { describe, expect, it } from "vitest";
import {
  AGENT_PAGE_SIZE,
  agentShortName,
  defaultAgentListingsState,
  parseAgentParams,
  toAgentListingsQuery,
  toAgentQueryString,
  updateAgentState,
} from "./agent-params";

describe("agent listing params", () => {
  it("reads valid values and falls back on junk", () => {
    expect(parseAgentParams(new URLSearchParams("mode=rent&type=condo&sort=price-asc&page=3"))).toEqual({
      mode: "rent",
      type: "condo",
      sort: "price-asc",
      page: 3,
    });
    expect(parseAgentParams(new URLSearchParams("mode=lease&type=boat&sort=station&page=-2"))).toEqual(
      defaultAgentListingsState,
    );
  });

  it("writes only non-default values and round-trips", () => {
    expect(toAgentQueryString(defaultAgentListingsState)).toBe("");
    const state = { ...defaultAgentListingsState, mode: "buy" as const, page: 2 };
    expect(toAgentQueryString(state)).toBe("mode=buy&page=2");
    expect(parseAgentParams(new URLSearchParams(toAgentQueryString(state)))).toEqual(state);
  });

  it("resets the page when a filter changes", () => {
    const onPage3 = { ...defaultAgentListingsState, page: 3 };
    expect(updateAgentState(onPage3, { mode: "rent" }).page).toBe(1);
    expect(updateAgentState(onPage3, { page: 4 }).page).toBe(4);
  });

  it("builds the GET /properties query for the agent", () => {
    expect(
      toAgentListingsQuery("kittipat-srisuk", { mode: "all", type: "house", sort: "price-desc", page: 2 }),
    ).toEqual({
      agent: "kittipat-srisuk",
      mode: undefined,
      type: "house",
      sort: "-price",
      page: 2,
      limit: AGENT_PAGE_SIZE,
    });
  });

  it("shortens a person's name but keeps an agency's", () => {
    expect(agentShortName({ name: "กิตติพัฒน์ ศรีสุข", company: "สุขุมวิท เรียลตี้" })).toBe("กิตติพัฒน์");
    expect(agentShortName({ name: "บ้านดี พร็อพเพอร์ตี้" })).toBe("บ้านดี พร็อพเพอร์ตี้");
  });
});

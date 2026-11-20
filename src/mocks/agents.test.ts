import { describe, expect, it } from "vitest";
import { getAgentProfile, getPropertyDetail, queryProperties } from "./db";

describe("agent mock data", () => {
  it("counts and filters an agent's listings consistently", () => {
    const agent = getAgentProfile("kittipat-srisuk")!;
    const all = queryProperties({ agent: agent.slug, limit: 100 });
    expect(all.meta.total).toBe(agent.counts.all);
    expect(agent.counts.buy + agent.counts.rent).toBe(agent.counts.all);
    expect(all.data.every((p) => p.agent.name === agent.name && p.agent.kind === "agent")).toBe(true);
    expect(agent.areas.length).toBeGreaterThan(0);
    expect(agent.areas[0].listingCount).toBeGreaterThanOrEqual(agent.areas.at(-1)!.listingCount);
  });

  it("returns nothing for unknown agents", () => {
    expect(getAgentProfile("nobody")).toBeUndefined();
    expect(queryProperties({ agent: "nobody" }).meta.total).toBe(0);
  });

  it("links a listing's poster to the profile with the same listing count", () => {
    const listing = queryProperties({ agent: "kittipat-srisuk", limit: 1 }).data[0];
    const detail = getPropertyDetail(listing.slug)!;
    expect(detail.poster.profileSlug).toBe("kittipat-srisuk");
    expect(detail.poster.activeListings).toBe(getAgentProfile("kittipat-srisuk")!.counts.all);
  });
});

import { describe, expect, it } from "vitest";
import { server } from "@/mocks/node";
import { failingHandler } from "@/mocks/handlers";
import { setMockScenario } from "@/mocks/scenario";
import { ApiError } from "./client";
import { api } from "./endpoints";

// These go through the real client and the MSW handlers, i.e. the same path as the browser.

describe("GET /properties", () => {
  it("paginates with metadata", async () => {
    const res = await api.listProperties({ page: 2, limit: 5 });
    expect(res.data).toHaveLength(5);
    expect(res.meta).toMatchObject({ page: 2, limit: 5 });
    expect(res.meta.totalPages).toBe(Math.ceil(res.meta.total / 5));
  });

  it("returns only pinned placements, flagged", async () => {
    const res = await api.listProperties({ pinned: true });
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data.every((p) => p.isPinned)).toBe(true);
  });

  it("excludes pinned placements and sorts newest first", async () => {
    const { data } = await api.listProperties({ pinned: false, sort: "-postedAt", limit: 50 });
    expect(data.some((p) => p.isPinned)).toBe(false);
    expect(data.map((p) => p.postedAt)).toEqual([...data.map((p) => p.postedAt)].sort().reverse());
  });

  it("filters by mode, type and price range", async () => {
    const { data } = await api.listProperties({ mode: "rent", type: "condo", maxPrice: 30_000, limit: 100 });
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((p) => p.mode === "rent" && p.type === "condo" && p.price <= 30_000)).toBe(true);
  });

  it("matches every keyword term, case-insensitively", async () => {
    const { data } = await api.listProperties({ q: "e6", limit: 100 });
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((p) => p.station?.code === "E6")).toBe(true);
  });

  it("returns an empty page when nothing matches", async () => {
    const res = await api.listProperties({ q: "no-such-place-xyz" });
    expect(res.data).toEqual([]);
    expect(res.meta).toMatchObject({ total: 0, totalPages: 1 });
  });

  it("rejects invalid query values with a NestJS-style 400", async () => {
    const error = await api.listProperties({ limit: 500 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).body?.message).toEqual(["limit must be an integer between 1 and 100"]);
  });
});

describe("reference data", () => {
  it("lists stations grouped by line, projects and categories", async () => {
    const [stations, projects, categories] = await Promise.all([
      api.listStations(),
      api.listProjects({ status: "new" }),
      api.listCategories(),
    ]);
    expect(stations.data.map((l) => l.id)).toEqual(["bts-sukhumvit", "bts-silom", "mrt-blue"]);
    expect(projects.data.length).toBeGreaterThan(0);
    expect(categories.data.map((c) => c.type)).toContain("condo");
  });
});

describe("error cases", () => {
  it("surfaces server errors as ApiError", async () => {
    server.use(failingHandler("/stations", 503));
    await expect(api.listStations()).rejects.toMatchObject({ name: "ApiError", status: 503 });
  });

  it("supports the error and empty scenarios", async () => {
    setMockScenario("error");
    await expect(api.listCategories()).rejects.toMatchObject({ status: 500 });

    setMockScenario("empty");
    const res = await api.listProperties();
    expect(res.data).toEqual([]);
    expect(res.meta.total).toBe(0);
  });
});

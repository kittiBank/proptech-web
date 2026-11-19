import { beforeEach, describe, expect, it } from "vitest";
import { queryProperties } from "@/mocks/db";
import { seedDemoFavorites } from "@/mocks/favorites";
import { server } from "@/mocks/node";
import { resetMockSession } from "@/mocks/session";
import { DEMO_ACCOUNT, MOCK_RESET_TOKEN, MOCK_VERIFY_TOKEN } from "@/mocks/constants";
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

  it("matches any of several comma-separated stations", async () => {
    const { data } = await api.listProperties({ station: "E4,N5", limit: 100 });
    const codes = new Set(data.map((p) => p.station?.code));
    expect(codes).toEqual(new Set(["E4", "N5"]));
  });

  it("filters by minimum bedrooms and usable area", async () => {
    const { data } = await api.listProperties({ minBedrooms: 2, minArea: 60, maxArea: 100, limit: 100 });
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((p) => p.bedrooms >= 2 && p.area >= 60 && p.area <= 100)).toBe(true);
  });

  it("sorts by walking distance to the station, listings without one last", async () => {
    const { data } = await api.listProperties({ sort: "stationDistance", limit: 100 });
    const distances = data.map((p) => p.stationDistance ?? Number.MAX_SAFE_INTEGER);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it("gives every listing a map position", async () => {
    const { data } = await api.listProperties({ limit: 100 });
    expect(data.every((p) => p.point && p.point.lat > 13 && p.point.lng > 100)).toBe(true);
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

describe("gallery and ads", () => {
  it("gives every listing a gallery that starts with its cover", async () => {
    const { data } = await api.listProperties({ limit: 100 });
    for (const p of data) {
      expect(p.gallery?.[0]).toEqual(p.image);
      expect(new Set(p.gallery?.map((img) => img.src)).size).toBe(p.gallery?.length);
    }
    expect(data.some((p) => (p.gallery?.length ?? 0) >= 3)).toBe(true);
  });

  it("lists ads for a placement and rejects unknown placements", async () => {
    const res = await api.listAds({ placement: "home-feed" });
    expect(res.data.length).toBeGreaterThan(1);
    // @ts-expect-error unknown placement on purpose
    await expect(api.listAds({ placement: "nope" })).rejects.toMatchObject({ status: 400 });
  });
});

describe("reference data", () => {
  it("lists stations grouped by line, projects and categories", async () => {
    const [stations, projects, categories] = await Promise.all([
      api.listStations(),
      api.listProjects(),
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

describe("GET /properties/:slug", () => {
  it("returns the listing with location, amenities and poster", async () => {
    const { data } = await api.getProperty("penthouse-thonglor-river-skyline");
    expect(data.code).toBe("PH-1001");
    expect(data.location.stations[0]?.station.code).toBe("E6");
    expect(data.location.point.lat).toBeGreaterThan(13);
    expect(data.poster.name).toBe(data.agent.name);
  });

  it("is a 404 for an unknown slug", async () => {
    await expect(api.getProperty("no-such-listing")).rejects.toMatchObject({ status: 404 });
  });
});

describe("GET /properties/:slug/nearby", () => {
  it("returns other listings, closest first within the same deal type", async () => {
    const { data } = await api.listNearbyProperties("penthouse-thonglor-river-skyline", { limit: 6 });
    expect(data.length).toBeGreaterThan(0);
    expect(data.some((p) => p.slug === "penthouse-thonglor-river-skyline")).toBe(false);
    const sameMode = data.filter((p) => p.mode === "buy").map((p) => p.distance);
    expect(sameMode).toEqual([...sameMode].sort((a, b) => a - b));
  });

  it("rejects a limit above the maximum", async () => {
    await expect(api.listNearbyProperties("penthouse-thonglor-river-skyline", { limit: 99 })).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe("POST /properties/:slug/enquiries", () => {
  it("accepts a valid enquiry", async () => {
    const res = await api.createEnquiry("penthouse-thonglor-river-skyline", {
      name: "สมหญิง",
      phone: "0812345678",
      message: "สนใจครับ",
    });
    expect(res.data.id).toMatch(/^enq-/);
  });

  it("rejects a bad phone number", async () => {
    await expect(
      api.createEnquiry("penthouse-thonglor-river-skyline", { name: "a", phone: "123", message: "x" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("GET /projects", () => {
  it("filters, paginates and counts per status", async () => {
    const all = await api.listProjects({ limit: 5 });
    expect(all.data).toHaveLength(5);
    expect(all.meta.total).toBe(all.counts.all);
    expect(all.counts.all).toBe(all.counts["pre-sale"] + all.counts["under-construction"] + all.counts.ready);

    const ready = await api.listProjects({ status: "ready", type: "condo" });
    expect(ready.data.length).toBeGreaterThan(0);
    expect(ready.data.every((p) => p.status === "ready" && p.type === "condo")).toBe(true);
    // Counts ignore the status filter so every tab can show its number.
    expect(ready.counts.all).toBeGreaterThan(ready.meta.total);
  });

  it("sorts by starting price and filters by line and price", async () => {
    const { data } = await api.listProjects({ sort: "startingPrice", line: "bts-sukhumvit", maxPrice: 10_000_000 });
    expect(data.every((p) => p.station?.line === "bts-sukhumvit" && p.startingPrice <= 10_000_000)).toBe(true);
    expect(data.map((p) => p.startingPrice)).toEqual([...data.map((p) => p.startingPrice)].sort((a, b) => a - b));
  });

  it("returns the featured project and rejects bad queries", async () => {
    const { data } = await api.listProjects({ featured: true });
    expect(data.map((p) => p.slug)).toEqual(["aster-sathorn"]);
    // @ts-expect-error unknown status on purpose
    await expect(api.listProjects({ status: "sold" })).rejects.toMatchObject({ status: 400 });
  });
});

describe("GET /projects/:slug", () => {
  it("returns units, milestones, location and listing count", async () => {
    const { data } = await api.getProject("aster-sathorn");
    expect(data.unitTypes[0].price).toBe(data.startingPrice);
    expect(data.milestones.filter((m) => m.state === "current")).toHaveLength(1);
    expect(data.location.stations[0].station.code).toBe("S3");
    expect(data.listingCount).toBeGreaterThan(0);

    const listings = await api.listProperties({ project: "aster-sathorn" });
    expect(listings.meta.total).toBe(data.listingCount);
    expect(listings.data.every((p) => p.projectName === data.name)).toBe(true);
  });

  it("404s for unknown projects and lists nearby ones", async () => {
    await expect(api.getProject("nope")).rejects.toMatchObject({ status: 404 });
    const nearby = await api.listNearbyProjects("aster-sathorn", 3);
    expect(nearby.data.length).toBeGreaterThan(0);
    expect(nearby.data.map((p) => p.distance)).toEqual([...nearby.data.map((p) => p.distance)].sort((a, b) => a - b));
    expect(nearby.data.some((p) => p.slug === "aster-sathorn")).toBe(false);
  });

  it("accepts a valid viewing request and rejects a bad phone", async () => {
    const ok = await api.createProjectViewing("aster-sathorn", {
      name: "สมหญิง",
      phone: "081-234-5678",
      date: "2026-12-01",
    });
    expect(ok.data.id).toMatch(/^pv-/);
    await expect(
      api.createProjectViewing("aster-sathorn", { name: "สมหญิง", phone: "123", date: "2026-12-01" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("/me/favorites", () => {
  beforeEach(() => resetMockSession({ signedIn: true }));

  it("requires a session", async () => {
    resetMockSession();
    await expect(api.listFavorites()).rejects.toMatchObject({ status: 401 });
    await expect(api.saveFavorite("p-1001")).rejects.toMatchObject({ status: 401 });
  });

  it("saves, notes and removes a favorite", async () => {
    expect((await api.listFavorites()).data).toEqual([]);
    const saved = await api.saveFavorite("p-1001");
    expect(saved.data).toMatchObject({ status: "active", note: "", savedPrice: saved.data.property.price });
    // Saving again is a no-op.
    await api.saveFavorite("p-1001");
    expect((await api.listFavorites()).data).toHaveLength(1);

    const noted = await api.updateFavoriteNote("p-1001", " ถามที่จอดรถ ");
    expect(noted.data.note).toBe("ถามที่จอดรถ");

    await api.removeFavorite("p-1001");
    expect((await api.listFavorites()).data).toEqual([]);
  });

  it("rejects unknown listings and over-long notes", async () => {
    await expect(api.saveFavorite("nope")).rejects.toMatchObject({ status: 404 });
    await api.saveFavorite("p-1001");
    await expect(api.updateFavoriteNote("p-1001", "x".repeat(201))).rejects.toMatchObject({ status: 400 });
  });

  it("reports price drops and closed listings in the demo list", async () => {
    seedDemoFavorites();
    const { data } = await api.listFavorites();
    expect(data.some((f) => f.savedPrice > f.property.price)).toBe(true);
    expect(data.find((f) => f.property.id === "g-2010")?.status).toBe("closed");
  });
});

describe("GET /compare", () => {
  it("returns details in the order asked and flags closed listings", async () => {
    const { data } = await api.compareListings(["p-1004", "g-2010", "missing"]);
    expect(data.map((p) => p.id)).toEqual(["p-1004", "g-2010"]);
    expect(data.map((p) => p.status)).toEqual(["active", "closed"]);
    expect(data[0].location.stations.length).toBeGreaterThan(0);
  });

  it("accepts at most 3 ids", async () => {
    await expect(api.compareListings(["a", "b", "c", "d"])).rejects.toMatchObject({ status: 400 });
  });

  it("keeps closed listings out of search", async () => {
    const { data } = queryProperties({ limit: 1000 });
    expect(data.length).toBeGreaterThan(100);
    expect(data.some((p) => p.id === "g-2010")).toBe(false);
  });
});

describe("auth", () => {
  it("logs in, reads the session and logs out", async () => {
    expect((await api.getSession()).data).toBeNull();
    await expect(api.login({ email: DEMO_ACCOUNT.email, password: "wrong", remember: true })).rejects.toMatchObject({
      status: 401,
    });
    const { data } = await api.login({ ...DEMO_ACCOUNT, remember: true });
    expect(data).toMatchObject({ firstName: "สมหญิง", emailVerified: true });
    expect(data).not.toHaveProperty("password");
    expect((await api.getSession()).data?.id).toBe(data.id);
    await api.logout();
    expect((await api.getSession()).data).toBeNull();
  });

  it("registers, verifies the email and onboards", async () => {
    const body = {
      firstName: "ทดสอบ",
      lastName: "ระบบ",
      email: "new@example.com",
      password: "abc12345",
      acceptTerms: true as const,
      marketing: false,
    };
    const { data } = await api.register(body);
    expect(data).toMatchObject({ emailVerified: false, onboarded: false });
    await expect(api.register(body)).rejects.toMatchObject({ status: 409 });

    await expect(api.verifyEmail("nope")).rejects.toMatchObject({ status: 400 });
    expect((await api.verifyEmail(MOCK_VERIFY_TOKEN)).data.emailVerified).toBe(true);

    const done = await api.completeOnboarding({ role: "owner" });
    expect(done.data).toMatchObject({ onboarded: true, role: "owner" });
  });

  it("resets a password and signs out", async () => {
    await api.login({ ...DEMO_ACCOUNT, remember: true });
    await api.forgotPassword({ email: DEMO_ACCOUNT.email });
    await expect(api.resetPassword({ token: "bad", password: "newpass123" })).rejects.toMatchObject({ status: 400 });
    await api.resetPassword({ token: MOCK_RESET_TOKEN, password: "newpass123" });
    expect((await api.getSession()).data).toBeNull();
    await expect(api.login({ ...DEMO_ACCOUNT, remember: true })).rejects.toMatchObject({ status: 401 });
    expect((await api.login({ email: DEMO_ACCOUNT.email, password: "newpass123", remember: true })).data.email).toBe(
      DEMO_ACCOUNT.email,
    );
  });

  it("signs in with Google", async () => {
    const { data } = await api.oauthLogin("google");
    expect(data).toMatchObject({ lastName: "Google", onboarded: false });
  });
});

describe("/me/drafts", () => {
  beforeEach(() => resetMockSession({ signedIn: true }));

  const complete = {
    posterKind: "owner" as const,
    deal: "sale" as const,
    propertyType: "condo" as const,
    projectName: "แอสเตอร์ สาทร",
    district: "สาทร",
    province: "กรุงเทพมหานคร",
    point: { lat: 13.72, lng: 100.53 },
    bedrooms: 1,
    bathrooms: 1,
    area: 35,
    floor: 10,
    title: "1 ห้องนอน ชั้น 10 ใกล้ BTS",
    description: "ก".repeat(120),
    photos: [1, 2, 3, 4, 5].map((i) => ({ id: `p${i}`, url: "data:,", name: `${i}.jpg`, status: "ready" as const })),
    price: 6_900_000,
    confirmed: true,
  };

  it("creates, auto-saves and lists a draft", async () => {
    await expect(api.listDrafts()).resolves.toEqual({ data: [] });
    const { data } = await api.createDraft();
    expect(data.values).toMatchObject({ posterKind: "owner", deal: "sale", photos: [] });
    const saved = await api.updateDraft(data.id, { values: { propertyType: "condo" }, completedSteps: ["type"] });
    expect(saved.data).toMatchObject({ completedSteps: ["type"], values: { propertyType: "condo", deal: "sale" } });
    expect((await api.listDrafts()).data.map((d) => d.id)).toEqual([data.id]);
  });

  it("checks photos like the media service", async () => {
    const { data } = await api.createDraft();
    const base = { size: 2_000_000, mimeType: "image/jpeg", width: 1600, height: 1200, preview: "data:," };
    expect((await api.uploadPhoto(data.id, { ...base, name: "living.jpg" })).data.status).toBe("ready");
    expect((await api.uploadPhoto(data.id, { ...base, name: "tel-number.jpg" })).data.reason).toMatch(/เบอร์โทร/);
    expect((await api.uploadPhoto(data.id, { ...base, name: "small.jpg", width: 800 })).data.reason).toMatch(
      /เล็กเกินไป/,
    );
    expect((await api.uploadPhoto(data.id, { ...base, name: "a.gif", mimeType: "image/gif" })).data.status).toBe(
      "rejected",
    );
  });

  it("refuses to publish an incomplete draft, then publishes a complete one", async () => {
    const { data } = await api.createDraft();
    await expect(api.publishDraft(data.id)).rejects.toMatchObject({ status: 422 });
    await api.updateDraft(data.id, { values: complete });
    const published = await api.publishDraft(data.id);
    expect(published.data.listing).toMatchObject({ status: "pending_review", code: expect.stringMatching(/^PH-/) });
    expect(published.data.order).toBeUndefined();
    expect((await api.getSubmission(data.id)).data.values.title).toBe(complete.title);
    expect((await api.getListingQuota()).data).toEqual({ used: 1, limit: 2 });
    await expect(api.getDraft(data.id)).rejects.toMatchObject({ status: 404 });
  });

  it("returns an order for a paid promotion and blocks unverified agents", async () => {
    const paid = await api.createDraft();
    await api.updateDraft(paid.data.id, { values: { ...complete, promotion: "featured" } });
    expect((await api.publishDraft(paid.data.id)).data.order).toMatchObject({ amount: 590, promotion: "featured" });

    const agent = await api.createDraft();
    await api.updateDraft(agent.data.id, { values: { ...complete, posterKind: "agent" } });
    await expect(api.publishDraft(agent.data.id)).rejects.toMatchObject({ status: 403 });
  });

  it("stops owners at the free quota", async () => {
    for (let i = 0; i < 2; i++) {
      const d = await api.createDraft();
      await api.updateDraft(d.data.id, { values: complete });
      await api.publishDraft(d.data.id);
    }
    const third = await api.createDraft();
    await api.updateDraft(third.data.id, { values: complete });
    await expect(api.publishDraft(third.data.id)).rejects.toMatchObject({ status: 409 });
  });
});

describe("posting helpers", () => {
  it("finds projects and nearby stations", async () => {
    const places = await api.searchProjectPlaces("แอสเตอร์");
    expect(places.data[0]).toMatchObject({ name: "แอสเตอร์ สาทร", district: "สาทร", province: "กรุงเทพมหานคร" });
    const stations = await api.listNearbyStations(places.data[0].point);
    expect(stations.data[0].station.code).toBe("S3");
    expect(stations.data.every((s) => s.distance <= 1500)).toBe(true);
    const promos = await api.listPromotions();
    expect(promos.data.find((p) => p.id === "homepage_pin")?.slotsLeft).toBe(5);
  });
});

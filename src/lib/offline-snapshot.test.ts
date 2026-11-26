import { afterEach, describe, expect, it } from "vitest";
import { clearOfflineSnapshots, readOfflineSnapshot, saveOfflineSnapshot } from "./offline-snapshot";

describe("offline snapshot", () => {
  afterEach(() => window.localStorage.clear());

  it("round-trips the data for the same user only", () => {
    saveOfflineSnapshot("favorites", { userId: "u1", savedAt: 1000, data: [1, 2] });
    expect(readOfflineSnapshot("favorites", "u1")).toEqual({ userId: "u1", savedAt: 1000, data: [1, 2] });
    expect(readOfflineSnapshot("favorites", "u2")).toBeUndefined();
  });

  it("serves the last user's copy while the session is unknown, until sign-out clears it", () => {
    saveOfflineSnapshot("favorites", { userId: "u1", savedAt: 1000, data: [1] });
    window.localStorage.setItem("other", "kept");
    expect(readOfflineSnapshot("favorites", undefined)?.data).toEqual([1]);
    clearOfflineSnapshots();
    expect(readOfflineSnapshot("favorites", undefined)).toBeUndefined();
    expect(window.localStorage.getItem("other")).toBe("kept");
  });

  it("ignores missing or corrupt entries", () => {
    expect(readOfflineSnapshot("favorites", "u1")).toBeUndefined();
    window.localStorage.setItem("propertyhub:offline:favorites", "{oops");
    expect(readOfflineSnapshot("favorites", "u1")).toBeUndefined();
  });
});

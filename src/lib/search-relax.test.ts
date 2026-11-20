import { describe, expect, it } from "vitest";
import { defaultSearchState } from "./search-params";
import { buildRelaxations, neighbourStations, pickRelaxations } from "./search-relax";

describe("neighbourStations", () => {
  it("adds the stations on either side, once, skipping chosen ones", () => {
    expect(neighbourStations(["E5"])).toEqual(["E4", "E6"]);
    expect(neighbourStations(["E5", "E6"])).toEqual(["E4", "E7"]);
    expect(neighbourStations(["ZZ9"])).toEqual([]);
  });
});

describe("buildRelaxations", () => {
  it("offers nothing when no filter is set", () => {
    expect(buildRelaxations(defaultSearchState)).toEqual([]);
  });

  it("loosens each filter on its own and resets the page", () => {
    const state = {
      ...defaultSearchState,
      page: 3,
      keyword: "วิวสวน",
      type: "condo" as const,
      stations: ["E5"],
      price: "3-5m",
      bedrooms: "3",
      area: "35-60",
    };
    const r = buildRelaxations(state);
    expect(r.map((x) => x.id)).toEqual([
      "stations",
      "stations",
      "price",
      "price",
      "bedrooms",
      "bedrooms",
      "area",
      "type",
      "keyword",
    ]);
    expect(r.every((x) => x.state.page === 1)).toBe(true);

    const [stations, anyStation, price, anyPrice, beds, anyBeds, area, type, keyword] = r;
    expect(anyStation.state.stations).toEqual([]);
    expect(anyPrice.state.price).toBe("any");
    expect(anyBeds.state.bedrooms).toBe("any");
    expect(stations.detail).toBe("รวมสถานีอโศก และ ทองหล่อ");
    expect(stations.state.stations).toEqual(["E5", "E4", "E6"]);
    expect(price.title).toBe("ขยับงบเป็น 5 – 10 ล้าน");
    expect(price.state).toMatchObject({ price: "5-10m", bedrooms: "3", type: "condo" });
    expect(beds.title).toBe("2 ห้องนอนขึ้นไป");
    expect(area.state.area).toBe("any");
    expect(type.state.type).toBe("all");
    expect(keyword.state.keyword).toBe("");
  });

  it("drops the bound when there is nothing looser", () => {
    const r = buildRelaxations({ ...defaultSearchState, price: "20m+", bedrooms: "1" });
    expect(r.filter((x) => x.id === "price")).toMatchObject([{ title: "ไม่จำกัดช่วงราคา", state: { price: "any" } }]);
    expect(r.filter((x) => x.id === "bedrooms").map((x) => x.state.bedrooms)).toEqual(["any"]);
  });

  it("picks the first step per filter that finds listings", () => {
    const r = buildRelaxations({ ...defaultSearchState, stations: ["E5"], price: "3-5m", type: "condo" });
    // stations: nearby 0, any 7 · price: next 0, any 3 · type: 12
    const picked = pickRelaxations(r, [0, 7, 0, 3, 12], 4);
    expect(picked.map((p) => [p.title, p.total])).toEqual([
      ["ไม่จำกัดสถานี", 7],
      ["ไม่จำกัดช่วงราคา", 3],
      ["ทุกประเภททรัพย์", 12],
    ]);
    expect(pickRelaxations(r, [5, 7, 2, 3, 12], 2).map((p) => p.title)).toEqual([
      "เพิ่มสถานีใกล้เคียง",
      "ขยับงบเป็น 5 – 10 ล้าน",
    ]);
  });
});

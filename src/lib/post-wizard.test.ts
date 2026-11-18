import { describe, expect, it } from "vitest";
import type { DraftPhoto, DraftValues } from "@/types/api";
import { defaultDraftValues, draftDescription, reachableSteps, stepErrors } from "./post-wizard";

const v = (over: Partial<DraftValues>): DraftValues => ({ ...defaultDraftValues, ...over });
const photo = (i: number, status: DraftPhoto["status"] = "ready"): DraftPhoto => ({
  id: `p${i}`,
  url: "x",
  name: `${i}.jpg`,
  status,
});

describe("stepErrors", () => {
  it("requires a property type and blocks developers", () => {
    expect(stepErrors("type", v({}))).toHaveProperty("propertyType");
    expect(stepErrors("type", v({ propertyType: "condo", posterKind: "developer" }))).toHaveProperty("posterKind");
    expect(stepErrors("type", v({ propertyType: "condo" }))).toEqual({});
  });

  it("checks the floor against the building height", () => {
    const errors = stepErrors("details", v({ propertyType: "condo", floor: 38, totalFloors: 35 }));
    expect(errors.floor).toBe("ชั้นต้องไม่เกินจำนวนชั้นของอาคาร (35)");
  });

  it("rejects contact details in the title and short descriptions", () => {
    const errors = stepErrors(
      "details",
      v({ propertyType: "land", area: 100, title: "ขายที่ดิน โทร 081-234-5678", description: "abc" }),
    );
    expect(errors.title).toMatch(/ห้ามใส่เบอร์โทร/);
    expect(errors.description).toMatch(/ตอนนี้ 3/);
  });

  it("skips room fields for land", () => {
    const errors = stepErrors(
      "details",
      v({ propertyType: "land", area: 100, title: "ที่ดินเปล่า ถมแล้ว ติดถนน", description: "ก".repeat(120) }),
    );
    expect(errors).toEqual({});
  });

  it("needs five ready photos, rejected ones do not count", () => {
    const photos = [0, 1, 2, 3].map((i) => photo(i)).concat(photo(9, "rejected"));
    expect(stepErrors("photos", v({ photos })).photos).toMatch(/ตอนนี้ 4/);
    expect(stepErrors("photos", v({ photos: [...photos, photo(5)] }))).toEqual({});
  });

  it("asks for the prices the deal needs and the confirmation", () => {
    expect(Object.keys(stepErrors("publish", v({ deal: "both" })))).toEqual(["price", "rentPrice", "confirmed"]);
  });
});

describe("reachableSteps", () => {
  it("opens completed steps plus the next one", () => {
    expect(reachableSteps([])).toEqual(["type"]);
    expect(reachableSteps(["type", "location"])).toEqual(["type", "location", "details"]);
  });
});

it("drafts a description from the entered data", () => {
  const text = draftDescription(
    v({ propertyType: "condo", bedrooms: 2, bathrooms: 2, area: 72, stations: ["E5"], furnishing: "fully" }),
    {
      E5: "BTS พร้อมพงษ์",
    },
  );
  expect(text).toContain("2 ห้องนอน");
  expect(text).toContain("BTS พร้อมพงษ์");
  expect(text.length).toBeGreaterThan(100);
});

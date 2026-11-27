import { describe, expect, it } from "vitest";
import { postSteps, stepErrors } from "@/lib/post-wizard";
import { findStation } from "@/lib/search";
import { getPropertyDetail, sellerSourceListings } from "./db";
import { draftValuesFromProperty } from "./listing-values";

describe("draftValuesFromProperty (FE-24)", () => {
  it("prefills every seeded dashboard listing with values that pass all wizard steps", () => {
    const failing = sellerSourceListings(61).flatMap((p) => {
      const values = draftValuesFromProperty(getPropertyDetail(p.slug)!);
      const errors = postSteps.flatMap((s) => Object.entries(stepErrors(s.id, values)).map(([f, m]) => `${f}: ${m}`));
      if (values.stations.some((code) => !findStation(code))) {
        errors.push(`stations: ${JSON.stringify(values.stations)}`);
      }
      return errors.length ? [`${p.slug} → ${errors.join("; ")}`] : [];
    });
    expect(failing).toEqual([]);
  });
});

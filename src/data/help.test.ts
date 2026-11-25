import { describe, expect, it } from "vitest";
import { helpFaqs, helpTopics, searchFaqs } from "./help";

describe("help center content", () => {
  it("gives every topic at least two questions", () => {
    for (const t of helpTopics) expect(helpFaqs.filter((f) => f.topic === t.id).length).toBeGreaterThanOrEqual(2);
    expect(new Set(helpFaqs.map((f) => f.id)).size).toBe(helpFaqs.length);
  });

  it("searches questions and answers, within a topic", () => {
    expect(searchFaqs("ไม่ผ่าน").map((f) => f.id)).toContain("listing-rejected");
    expect(searchFaqs("มัดจำ", "safety").map((f) => f.id)).toEqual(["deposit-scam"]);
    expect(searchFaqs("มัดจำ", "billing")).toEqual([]);
    expect(searchFaqs("", "agents")).toHaveLength(2);
  });
});

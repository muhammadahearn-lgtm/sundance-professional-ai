import { describe, expect, it } from "vitest";
import { DEFAULT_SEARCH, activeFilterCount, canAddToCompare, experienceRange, intersect, plainPreview, pushRecent, relevance, sanitizeKeyword } from "./job-search";

describe("job search helpers", () => {
  it("allows comparing at most 4 jobs", () => { expect(canAddToCompare(3)).toBe(true); expect(canAddToCompare(4)).toBe(false); });
  it("maps experience buckets", () => { expect(experienceRange("3-5")).toEqual({ min: 3, max: 5 }); expect(experienceRange("10+")).toEqual({ min: 10, max: null }); });
  it("strips filter-breaking characters", () => expect(sanitizeKeyword("python,(aws)%")).toBe("python aws"));
  it("intersects filter sets so filters combine", () => { expect(intersect(null, ["a", "b"])).toEqual(["a", "b"]); expect(intersect(["a", "b"], ["b", "c"])).toEqual(["b"]); });
  it("counts active filters", () => expect(activeFilterCount({ ...DEFAULT_SEARCH, langs: ["x", "y"], arr: ["remote"], smin: 100000 })).toBe(4));
  it("keeps recent searches unique and capped at 6", () => {
    expect(pushRecent(["Python", "AWS"], "python")).toEqual(["python", "AWS"]);
    expect(pushRecent(["1", "2", "3", "4", "5", "6"], "7")).toHaveLength(6);
  });
  it("ranks title matches above description matches", () => expect(relevance("Data Engineer", "", "data")).toBeGreaterThan(relevance("Analyst", "data", "data")));
  it("previews plain text", () => expect(plainPreview("## About\n**Build** things")).toBe("Build things"));
});

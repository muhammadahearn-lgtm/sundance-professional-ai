import { describe, expect, it } from "vitest";
import { categoryScore, computeMatch, experienceScore, matchTier, meetsMinMatch, preferenceScore, salaryNumber, type MatchCandidate, type MatchJob } from "./match-engine";

const cand: MatchCandidate = { langs: ["py", "sql"], skills: ["etl"], techs: ["aws"], years: 8, workArrangement: "remote", location: "Austin, TX", locationsOfInterest: [], targetRoles: ["Data Engineer"], roleId: null, availability: "active" };
const job: MatchJob = { langs: [{ id: "py", level: "required" }, { id: "sql", level: "required" }], skills: [{ id: "etl", level: "required" }], techs: [{ id: "aws", level: "required" }, { id: "kafka", level: "preferred" }], minYears: 5, workArrangement: "remote", location: "Remote", roleId: null, title: "Senior Data Engineer" };

describe("match engine", () => {
  it("required weighs 3, preferred 2, optional 1", () => {
    expect(categoryScore(["a"], [{ id: "a", level: "required" }, { id: "b", level: "preferred" }]).score).toBe(60);
    expect(categoryScore(["b"], [{ id: "a", level: "required" }, { id: "b", level: "optional" }]).score).toBe(25);
    expect(categoryScore([], []).score).toBe(100);
  });
  it("experience: 8 vs 5 is 100, 2 vs 5 is 40", () => {
    expect(experienceScore(8, 5)).toBe(100);
    expect(experienceScore(2, 5)).toBe(40);
  });
  it("overall = 20% languages + 30% skills + 20% tech + 20% experience + 10% preferences", () => {
    const r = computeMatch(cand, job, { kafka: "Kafka" });
    expect(r.technologies).toBe(60);
    expect(r.overall).toBe(Math.round((100 * 20 + 100 * 30 + 60 * 20 + 100 * 20 + 100 * 10) / 100));
    expect(r.details.missing.technologies).toEqual(["Kafka"]);
    expect(r.details.strengths).toContain("Experience exceeds requirement");
  });
  it("is deterministic", () => {
    expect(computeMatch(cand, job)).toEqual(computeMatch(cand, job));
  });
  it("preferences: on-site elsewhere, not looking → 60 (role + salary still fit)", () => {
    expect(preferenceScore({ ...cand, availability: "not_looking" }, { ...job, workArrangement: "on_site", location: "Boston, MA" }).score).toBe(60);
  });
  it("salary: $200k expectation vs $190k max loses 20 points; $150k fits", () => {
    expect(preferenceScore({ ...cand, salaryExpectation: "$200k" }, { ...job, maxSalary: 190000 }).score).toBe(80);
    expect(preferenceScore({ ...cand, salaryExpectation: "150,000" }, { ...job, maxSalary: 190000 }).score).toBe(100);
    expect(salaryNumber("$120k-150k")).toBe(120000);
  });
  it("match filter: 80%+ keeps 85, drops 79 and unscored", () => {
    expect([85, 79, null].map((n) => meetsMinMatch(n, 80))).toEqual([true, false, false]);
    expect(meetsMinMatch(null, 0)).toBe(true);
  });
  it("tiers: 90 excellent, 75 strong, 60 moderate, 59 weak", () => {
    expect([90, 75, 60, 59].map((n) => matchTier(n).label)).toEqual(["Excellent Match", "Strong Match", "Moderate Match", "Weak Match"]);
  });
});

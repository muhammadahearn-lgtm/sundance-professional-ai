import { describe, expect, it } from "vitest";
import { requiredCap, categoryScore, computeMatch, experienceScore, matchTier, meetsMinMatch, preferenceScore, salaryNumber, type MatchCandidate, type MatchJob } from "./match-engine";

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
  it("preferences: on-site elsewhere, not looking → 40 (role + salary still fit)", () => {
    expect(preferenceScore({ ...cand, availability: "not_looking" }, { ...job, workArrangement: "on_site", location: "Boston, MA" }).score).toBe(40);
  });
  it("salary: $200k expectation vs $190k max loses 20 points; $150k fits", () => {
    expect(preferenceScore({ ...cand, salaryAmount: 220000 }, { ...job, maxSalary: 190000 }).score).toBe(80);
    expect(preferenceScore({ ...cand, salaryAmount: 150000 }, { ...job, maxSalary: 190000 }).score).toBe(100);
  });
  it("gives partial salary credit within a 10% negotiable buffer", () => {
    const r = preferenceScore({ ...cand, salaryAmount: 105000 }, { ...job, maxSalary: 100000 });
    expect(r.score).toBe(94);
    expect(r.hits).toContain("Salary within negotiable range (+5%)");
    expect(preferenceScore({ ...cand, salaryAmount: 110000 }, { ...job, maxSalary: 100000 }).score).toBe(94);
    expect(preferenceScore({ ...cand, salaryAmount: 111000 }, { ...job, maxSalary: 100000 }).score).toBe(80);
    expect(salaryNumber("$120k-150k")).toBe(120000);
  });
  it("match filter: 80%+ keeps 85, drops 79 and unscored", () => {
    expect([85, 79, null].map((n) => meetsMinMatch(n, 80))).toEqual([true, false, false]);
    expect(meetsMinMatch(null, 0)).toBe(true);
  });
  it("tiers: 90 excellent, 75 strong, 60 moderate, 59 weak", () => {
    expect([90, 75, 60, 59].map((n) => matchTier(n).label)).toEqual(["Excellent Match", "Strong Match", "Moderate Match", "Weak Match"]);
  });
  it("blank categories are left out, not free 100s", () => {
    const j2: MatchJob = { ...job, langs: [], skills: [], techs: [{ id: "aws", level: "required" }, { id: "kafka", level: "preferred" }], minYears: 0 };
    // only tech (60, weight 20) + preferences (100, weight 10) count
    expect(computeMatch(cand, j2).overall).toBe(Math.round((60 * 20 + 100 * 10) / 30));
  });
  it("missing required items cap the score: 1 → 75, 2+ → 60", () => {
    expect([0, 1, 2, 5].map(requiredCap)).toEqual([100, 75, 60, 60]);
    const r = computeMatch({ ...cand, techs: [] }, { ...job, techs: [{ id: "aws", level: "required" }] }, { aws: "AWS" });
    expect(r.overall).toBe(75);
    expect(r.details.cap?.reason).toContain("AWS");
  });
});

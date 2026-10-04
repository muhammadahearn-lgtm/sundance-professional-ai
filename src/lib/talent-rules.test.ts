import { describe, expect, it } from "vitest";
import { DEFAULT_TALENT, canApply, matchesTalent, parseSalary, stageToStatus, timeline, type TalentRow } from "./talent-rules";

const row: TalentRow = { id: "1", name: "Cara Lee", jobTitle: "Data Engineer", employer: "Acme", location: "Austin, TX", years: 6, availability: "active", headline: "", summary: "", salary: "$150k", arrangement: "remote", industries: ["Technology"], roleId: "r1", langs: ["py"], skills: [], techs: ["aws"], updatedAt: "2026-01-01", completion: 50 };

describe("talent search", () => {
  it("parses salary text", () => { expect(parseSalary("$120k-150k")).toBe(120000); expect(parseSalary("140,000")).toBe(140000); expect(parseSalary("n/a")).toBeNull(); });
  it("5-8 years bucket includes 6", () => expect(matchesTalent(row, { ...DEFAULT_TALENT, exp: "5-8" })).toBe(true));
  it("10+ bucket excludes 6", () => expect(matchesTalent(row, { ...DEFAULT_TALENT, exp: "10+" })).toBe(false));
  it("requires every selected language", () => expect(matchesTalent(row, { ...DEFAULT_TALENT, langs: ["py", "go"] })).toBe(false));
  it("salary range filters", () => { expect(matchesTalent(row, { ...DEFAULT_TALENT, smax: 140000 })).toBe(false); expect(matchesTalent(row, { ...DEFAULT_TALENT, smin: 100000 })).toBe(true); });
  it("keyword hits a technology id", () => expect(matchesTalent(row, { ...DEFAULT_TALENT, q: "aws" }, ["aws"])).toBe(true));
});

describe("applications", () => {
  it("only active jobs accept applications", () => {
    expect(canApply("active", false).ok).toBe(true);
    expect(canApply("draft", false).ok).toBe(false);
    expect(canApply("paused", false).ok).toBe(false);
    expect(canApply("closed", false).reason).toBe("Job Closed");
  });
  it("blocks duplicates", () => expect(canApply("active", true).reason).toBe("Already Applied"));
  it("maps pipeline stages to statuses", () => { expect(stageToStatus("offer")).toBe("offer"); expect(stageToStatus("contacted")).toBe("recruiter_contacted"); expect(stageToStatus("saved")).toBeNull(); });
  it("timeline marks earlier steps done", () => {
    const t = timeline("recruiter_contacted");
    expect(t.map((s) => s.state).slice(0, 4)).toEqual(["done", "done", "current", "pending"]);
  });
});

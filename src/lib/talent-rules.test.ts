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

import { describe as d2, it as i2, expect as e2 } from "vitest";
import { matchesTalent as mt, DEFAULT_TALENT as DT } from "./talent-rules";
d2("soft skills filter", () => {
  const c = { id: "1", name: "A", jobTitle: "", employer: "", location: "", years: 3, availability: "", headline: "", summary: "", salary: "", arrangement: "", industries: [], roleId: null, langs: [], skills: [], techs: [], updatedAt: "", completion: 50, softSkills: ["comm", "lead"] };
  i2("keeps candidates having every selected soft skill", () => { e2(mt(c, { ...DT, soft: ["comm"] })).toBe(true); });
  i2("hides candidates missing a selected soft skill", () => { e2(mt(c, { ...DT, soft: ["teamwork"] })).toBe(false); });
});

import { effectiveTalentSort, talentSortOptions } from "./talent-rules";
describe("job-based candidate search", () => {
  it("no job selected hides match sorts", () => expect(talentSortOptions(false).map(([k]) => k)).toEqual(["updated", "exp_high", "avail", "alpha"]));
  it("job selected enables best/highest/lowest match", () => expect(talentSortOptions(true).slice(0, 3).map(([k]) => k)).toEqual(["match", "match_high", "match_low"]));
  it("match sort falls back to Most Recent without a job", () => expect(effectiveTalentSort("match", false)).toBe("updated"));
  it("defaults to Best Match once a job is selected", () => expect(effectiveTalentSort("updated", true)).toBe("updated"));
});

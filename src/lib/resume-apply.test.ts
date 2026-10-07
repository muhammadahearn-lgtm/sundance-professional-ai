import { describe, expect, it } from "vitest";
import { planResumeImport, EMPTY_EXISTING } from "./resume-apply";
import type { ParsedResume } from "./resume-parse";
import type { MatchedResume } from "./resume-taxonomy-matcher";

const job = (c: string, t: string, start: string | null) => ({ company_name: c, job_title: t, location: "", start_date: start, end_date: null, current_position: true, responsibilities: "", technologies_used: [] });
const parsed = { experience: [job("Acme", "Data Engineer", "2020-01-01"), job("NoDate Inc", "Dev", null)] } as unknown as ParsedResume;
const matched = {
  languages: [{ id: "py", name: "Python", kind: "language", source: "Python" }], skills: [], softSkills: [],
  technologies: [{ id: "re", name: "React", kind: "technology", source: "ReactJS" }, { id: "re", name: "React", kind: "technology", source: "react" }],
  education: [{ institution_name: "UT", degree: "BS", field_of_study: "CS", graduation_year: 2015, degree_type: "bachelors" }, { institution_name: "X", degree: "?", field_of_study: "CS", graduation_year: null, degree_type: null }],
  certifications: [], unmatched: [], currentRole: null, targetRoles: [], country: "",
} as unknown as MatchedResume;

describe("planResumeImport", () => {
  it("skips skills the candidate already has and dedupes", () => {
    const pl = planResumeImport(parsed, matched, { ...EMPTY_EXISTING, languageIds: ["py"] });
    expect(pl.languageIds).toEqual([]);
    expect(pl.technologyIds).toEqual(["re"]);
  });
  it("skips jobs without a start date and jobs already on the profile", () => {
    expect(planResumeImport(parsed, matched, EMPTY_EXISTING).jobs.map((j) => j.company_name)).toEqual(["Acme"]);
    expect(planResumeImport(parsed, matched, { ...EMPTY_EXISTING, jobs: [{ company_name: "acme", job_title: "data engineer" }] }).jobs).toEqual([]);
  });
  it("skips education without a recognised degree type", () => {
    expect(planResumeImport(parsed, matched, EMPTY_EXISTING).education.map((e) => e.institution_name)).toEqual(["UT"]);
  });
});

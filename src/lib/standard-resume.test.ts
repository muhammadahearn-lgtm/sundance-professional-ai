import { describe, expect, it } from "vitest";
import { STANDARD_RESUME_MAX_SOFT_SKILLS, STANDARD_RESUME_PREMIUM_PREVIEW, chosenResume, nextStandardResumeVersion, validSoftSkillSelection } from "./standard-resume";

describe("Sundance standard resume rules", () => {
  it("is free during the premium preview", () => expect(STANDARD_RESUME_PREMIUM_PREVIEW).toBe(true));
  it("defaults the recruiter download to an available file", () => {
    expect(chosenResume("standard", true, false)).toBe("original");
    expect(chosenResume("original", false, true)).toBe("standard");
  });
  it("increments immutable version numbers", () => expect(nextStandardResumeVersion([1, 2, 4])).toBe(5));
  it("limits standard resumes to five unique soft skills", () => {
    expect(STANDARD_RESUME_MAX_SOFT_SKILLS).toBe(5);
    expect(validSoftSkillSelection(["1", "2", "3", "4", "5"])).toBe(true);
    expect(validSoftSkillSelection(["1", "2", "3", "4", "5", "6"])).toBe(false);
    expect(validSoftSkillSelection(["1", "1"])).toBe(false);
  });
});

import { budgetResume as _b, earlierRoleLine as _e } from "./standard-resume";
describe("resume page budget", () => {
  const job = (t: string, start: string, end: string | null, current = false) => ({ title: t, company: "Co", location: "", start, end, current, responsibilities: "", technologies: [] });
  const base = { name: "", headline: "", location: "", summary: "", photo: null, skills: [], technologies: [], programmingLanguages: [], softSkills: [], spokenLanguages: [], education: [], projects: [] } as any;
  it("shows 4 most recent roles in full and condenses the rest", () => {
    const r = _b({ ...base, certifications: [], experience: [job("A", "2010-01-01", "2011-01-01"), job("B", "2020-01-01", null, true), job("C", "2015-01-01", "2016-01-01"), job("D", "2017-01-01", "2019-01-01"), job("E", "2012-01-01", "2014-01-01")] });
    expect(r.experience.map((e) => e.title)).toEqual(["B", "D", "C", "E"]);
    expect(r.earlier.map((e) => e.title)).toEqual(["A"]);
  });
  it("keeps the 4 most recent certifications", () => {
    const certs = ["2018", "2023", "2020", "2021", "2019"].map((y) => ({ name: y, issuer: "", issued: `${y}-01-01` }));
    expect(_b({ ...base, experience: [], certifications: certs }).certifications.map((c) => c.name)).toEqual(["2023", "2021", "2020", "2019"]);
  });
  it("formats an earlier role line", () => { expect(_e(job("Dev", "2014-01-01", "2016-05-01"))).toBe("Dev, Co (2014–2016)"); });
});

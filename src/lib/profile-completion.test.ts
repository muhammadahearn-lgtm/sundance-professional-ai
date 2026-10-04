import { describe, expect, it } from "vitest";
import { computeCompletion, validateProfessional, validateResumeFile, missingRequired, COMPLETION_WEIGHTS } from "./profile-completion";

const empty = { jobTitle: "", headline: "", location: "", yearsExperience: null, summary: "", experienceCount: 0, educationCount: 0, certificationCount: 0, skillCount: 0, languageCount: 0, technologyCount: 0, targetRoleCount: 0, salaryExpectation: "", hasResume: false };
const full = { jobTitle: "Data Engineer", headline: "h", location: "Boston", yearsExperience: 8, summary: "s", experienceCount: 1, educationCount: 1, certificationCount: 1, skillCount: 1, languageCount: 1, technologyCount: 1, targetRoleCount: 1, salaryExpectation: "$150k", hasResume: true };

describe("profile completion", () => {
  it("weights sum to 100", () => expect(Object.values(COMPLETION_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100));
  it("empty profile is 0%", () => expect(computeCompletion(empty).percent).toBe(0));
  it("full profile is 100% with no recommendations", () => {
    const r = computeCompletion(full);
    expect(r.percent).toBe(100);
    expect(r.recommendations).toHaveLength(0);
  });
  it("missing certifications recommends adding them", () => {
    const r = computeCompletion({ ...full, certificationCount: 0 });
    expect(r.percent).toBe(95);
    expect(r.recommendations).toContain("Add Certifications to increase profile completion.");
  });
  it("missing resume costs 10 points", () => expect(computeCompletion({ ...full, hasResume: false }).percent).toBe(90));
});

describe("validation", () => {
  it("requires role, headline, location, years", () => {
    const e = validateProfessional({ jobTitle: "", headline: "", location: "", yearsExperience: "", summary: "" });
    expect(Object.keys(e).sort()).toEqual(["headline", "jobTitle", "location", "yearsExperience"]);
  });
  it("rejects summary over 2000 chars", () => {
    expect(validateProfessional({ jobTitle: "a", headline: "b", location: "c", yearsExperience: "3", summary: "x".repeat(2001) }).summary).toBeDefined();
  });
  it("resume: rejects files over 10 MB", () => expect(validateResumeFile({ name: "a.pdf", type: "application/pdf", size: 10 * 1024 * 1024 + 1 })).not.toBeNull());
  it("resume: rejects non PDF/DOCX", () => expect(validateResumeFile({ name: "a.png", type: "image/png", size: 10 })).not.toBeNull());
  it("resume: accepts docx", () => expect(validateResumeFile({ name: "cv.docx", type: "", size: 10 })).toBeNull());
  it("requires a skill, technology and target role", () => {
    expect(missingRequired({ jobTitle: "a", headline: "b", location: "c", skillCount: 0, technologyCount: 0, targetRoleCount: 0 })).toEqual(["At least one skill", "At least one technology", "At least one target role"]);
  });
});

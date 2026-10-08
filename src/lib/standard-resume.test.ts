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

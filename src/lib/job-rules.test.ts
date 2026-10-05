import { describe, expect, it } from "vitest";
import { allowedActions, canDelete, canEdit, emptyJob, jobQuality, validateAll, validateSalary } from "./job-rules";

describe("job validation", () => {
  it("requires role, level, company, type, arrangement, location, years, description, a skill and a technology", () => {
    const e = validateAll({ ...emptyJob(), employment_type: "", work_arrangement: "" });
    for (const k of ["level_id", "role_id", "company_id", "employment_type", "work_arrangement", "location", "minimum_years_experience", "job_description", "skills", "technologies"]) expect(e).toHaveProperty(k);
  });
  it("rejects max salary not greater than min", () => {
    expect(validateSalary({ minimum_salary: "100000", maximum_salary: "100000" }).maximum_salary).toBeDefined();
    expect(validateSalary({ minimum_salary: "100000", maximum_salary: "120000" })).toEqual({});
  });
});

describe("job quality", () => {
  const full = { title: "T", description: "x".repeat(200), minSalary: 1, maxSalary: 2, skills: 1, technologies: 1, languages: 1, minYears: 3, experienceLevel: "Senior-Level", benefits: "401k" };
  it("is 100 when complete", () => expect(jobQuality(full).percent).toBe(100));
  it("recommends salary when missing", () => {
    const q = jobQuality({ ...full, minSalary: null, maxSalary: null });
    expect(q.percent).toBe(85);
    expect(q.recommendations).toContain("Add Salary Information");
  });
});

describe("job status", () => {
  it("closed jobs are read-only", () => { expect(allowedActions("closed")).toEqual([]); expect(canEdit("closed")).toBe(false); });
  it("drafts can be published", () => expect(allowedActions("draft")).toContain("publish"));
  it("cannot delete jobs with applications", () => { expect(canDelete(1)).toBe(false); expect(canDelete(0)).toBe(true); });
});

describe("job drafts", () => {
  it("an empty draft is 0% and cannot be published", async () => {
    const { draftCompletion, canPublish } = await import("./job-rules");
    expect(draftCompletion(emptyJob())).toBe(0);
    expect(canPublish(emptyJob("c1"))).toBe(false);
  });
  it("a fully filled draft is 100%", async () => {
    const { draftCompletion } = await import("./job-rules");
    expect(draftCompletion({ ...emptyJob(), role_id: "r", level_id: "l", job_description: "d", location: "Austin", location_country: "United States", location_state: "Texas", location_city: "Austin", skills: [{ id: "s", level: "required" }], technologies: [{ id: "t", level: "required" }], languages: [{ id: "p", level: "required" }], minimum_salary: "100000" })).toBe(100);
  });
});

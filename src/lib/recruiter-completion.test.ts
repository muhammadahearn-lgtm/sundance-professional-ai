import { describe, expect, it } from "vitest";
import { computeRecruiterCompletion, validateCompany, validateImageFile, validateRecruiter } from "./recruiter-completion";

const empty = { firstName: "", lastName: "", title: "", location: "", yearsExperience: 0, specialization: "", secondaryCount: 0, candidateTypeCount: 0, industryCount: 0, summary: "", hasCompany: false, companyComplete: false };

describe("recruiter completion", () => {
  it("is 0 when empty", () => expect(computeRecruiterCompletion(empty).percent).toBe(0));
  it("is 100 when everything is filled", () => {
    expect(computeRecruiterCompletion({ firstName: "S", lastName: "J", title: "T", location: "Boston", yearsExperience: 8, specialization: "Software Engineers", secondaryCount: 1, candidateTypeCount: 0, industryCount: 1, summary: "x", hasCompany: true, companyComplete: true }).percent).toBe(100);
  });
  it("suggests adding company information when missing", () => {
    expect(computeRecruiterCompletion(empty).suggestions).toContain("Add company information.");
  });
});

describe("validation", () => {
  it("requires the six recruiter fields", () => {
    expect(Object.keys(validateRecruiter({ first_name: "", last_name: "", title: "", company_name: "", location: "", specialization: "", summary: "" }))).toHaveLength(6);
  });
  it("caps recruiter summary at 2000 characters", () => {
    expect(validateRecruiter({ first_name: "a", last_name: "b", title: "c", company_name: "d", location: "e", specialization: "f", summary: "x".repeat(2001) }).summary).toBeDefined();
  });
  it("caps company description at 5000 characters", () => {
    expect(validateCompany({ company_name: "a", industry: "b", organization_type: "c", description: "x".repeat(5001) }).description).toBeDefined();
  });
  it("rejects gif and accepts webp", () => {
    expect(validateImageFile({ type: "image/gif", size: 10 })).not.toBeNull();
    expect(validateImageFile({ type: "image/webp", size: 10 })).toBeNull();
  });
});

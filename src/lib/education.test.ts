import { describe, expect, it } from "vitest";
import { educationLines, gradYearError, matchesEducation, normalizeEduText, eduKey, DEGREE_TYPES } from "./education";

describe("education governance", () => {
  it("has the 8 controlled degree types", () => expect(DEGREE_TYPES).toHaveLength(8));
  it("normalizes field of study and institution", () => {
    expect(normalizeEduText("  computer   science ")).toBe("Computer Science");
    expect(normalizeEduText("UNIVERSITY OF NEW HAMPSHIRE")).toBe("University Of New Hampshire");
    expect(eduKey("Computer Science")).toBe("computer_science");
  });
  it("accepts only 4-digit years", () => {
    expect(gradYearError("2024")).toBeNull();
    expect(gradYearError("Spring 2024")).not.toBeNull();
    expect(gradYearError("May 2026")).not.toBeNull();
  });
  it("displays in standard order", () => {
    expect(educationLines({ degree_type: "Bachelor's Degree", field_of_study: "Computer Science", institution_name: "University Of New Hampshire", graduation_year: 2024 }))
      .toEqual(["Bachelor's Degree", "Computer Science", "University Of New Hampshire", "2024"]);
  });
  it("filters Bachelor's+ / field / graduated after", () => {
    const recs = [{ degree_type: "Master's Degree", field_of_study: "Data Science", graduation_year: 2022 }];
    expect(matchesEducation(recs, { minDegree: "Bachelor's Degree", field: "data science", gradAfter: 2020 })).toBe(true);
    expect(matchesEducation(recs, { minDegree: "Doctorate (PhD)" })).toBe(false);
    expect(matchesEducation(recs, { gradAfter: 2022 })).toBe(false);
  });
});

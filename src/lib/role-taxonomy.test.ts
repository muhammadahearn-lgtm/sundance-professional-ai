import { describe, it, expect } from "vitest";
import { displayJobTitle, searchOptions } from "./role-taxonomy";

const roles = ["Data Engineer", "Data Analyst", "Data Scientist", "Business Intelligence Analyst", "Analytics Engineer", "Cloud Engineer", "Cloud Architect", "Cybersecurity Engineer", "Security Analyst", "Security Engineer", "Security Architect", "Software Engineer"].map((name, i) => ({ id: String(i), name }));

describe("role taxonomy", () => {
  it("shows the custom title when present", () => expect(displayJobTitle("Senior Data Engineer – AI Platform", "Senior", "Data Engineer")).toBe("Senior Data Engineer – AI Platform"));
  it("falls back to Level + Role", () => expect(displayJobTitle("", "Lead", "Cloud Engineer")).toBe("Lead Cloud Engineer"));
  it("'cloud' finds only cloud roles", () => expect(searchOptions(roles, "cloud").map((r) => r.name)).toEqual(["Cloud Engineer", "Cloud Architect"]));
  it("'security' finds the four security roles", () => expect(searchOptions(roles, "security").map((r) => r.name).sort()).toEqual(["Cybersecurity Engineer", "Security Analyst", "Security Architect", "Security Engineer"]));
  it("'data' finds data roles first", () => expect(searchOptions(roles, "data").slice(0, 3).map((r) => r.name)).toEqual(["Data Engineer", "Data Analyst", "Data Scientist"]));
});

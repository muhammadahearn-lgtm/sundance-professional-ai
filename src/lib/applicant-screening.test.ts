import { describe, expect, it } from "vitest";
import { matchesKeyword, passesAll, passesQuickFilter, qualificationPills, stepIndex } from "./applicant-screening";

describe("applicant screening", () => {
  it("strong fit means 75% or more", () => {
    expect(passesQuickFilter("strong", { score: 75, availability: "" })).toBe(true);
    expect(passesQuickFilter("strong", { score: 74, availability: "" })).toBe(false);
    expect(passesQuickFilter("strong", { availability: "" })).toBe(false);
  });
  it("no dealbreakers hides any knockout miss", () => {
    expect(passesQuickFilter("clean", { dealbreakers: 1, availability: "" })).toBe(false);
    expect(passesQuickFilter("clean", { availability: "" })).toBe(true);
  });
  it("ready now means actively looking", () => {
    expect(passesQuickFilter("ready", { availability: "active" })).toBe(true);
    expect(passesQuickFilter("ready", { availability: "open" })).toBe(false);
  });
  it("combines filters with AND", () => {
    expect(passesAll(["strong", "ready"], { score: 90, availability: "open" })).toBe(false);
  });
  it("keyword search needs every word", () => {
    expect(matchesKeyword("kube data", ["Ana", "Data Engineer", "Kubernetes"])).toBe(true);
    expect(matchesKeyword("snowflake", ["Ana", "Data Engineer"])).toBe(false);
  });
  it("pills reflect sub-scores", () => {
    expect(qualificationPills({ skill_alignment_score: 90, technology_alignment_score: 40, experience_alignment_score: 60 }).map((p) => p.label)).toEqual(["✓ Skills met", "Tech gaps", "Near experience bar"]);
  });
  it("speed review stops at the ends", () => {
    expect(stepIndex(0, 3, -1)).toBeNull();
    expect(stepIndex(2, 3, 1)).toBeNull();
    expect(stepIndex(1, 3, 1)).toBe(2);
  });
});

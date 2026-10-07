import { describe, expect, it } from "vitest";
import { canViewApplicationInsights, insightsEligible, standingText } from "./application-insights";

describe("application insights", () => {
  it("is free for everyone during launch preview", () => expect(canViewApplicationInsights(false)).toBe(true));
  it("unlocks only after entering the hiring process", () => {
    expect(insightsEligible("applied")).toBe(false);
    expect(insightsEligible("rejected")).toBe(false);
    expect(insightsEligible("interviewing")).toBe(true);
  });
  it("describes interview standing", () => {
    expect(standingText({ total: 95, inReview: 10, interviewing: 6, offers: 0, active: 20, status: "interviewing" })).toBe("You're 1 of 6 candidates interviewing, out of 95 applicants.");
  });
});

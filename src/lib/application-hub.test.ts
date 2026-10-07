import { describe, expect, it } from "vitest";
import { hubCounts, hubTab, matchesTab, nextStep } from "./application-hub";

describe("application hub", () => {
  it("groups statuses into tabs", () => {
    expect(hubTab("applied")).toBe("active");
    expect(hubTab("recruiter_contacted")).toBe("active");
    expect(hubTab("interviewing")).toBe("interviewing");
    expect(hubTab("offer")).toBe("offers");
    expect(hubTab("hired")).toBe("offers");
    expect(hubTab("rejected")).toBe("closed");
  });
  it("counts each tab", () => {
    expect(hubCounts(["applied", "viewed", "interviewing", "offer", "rejected"])).toEqual({ all: 5, active: 2, interviewing: 1, offers: 1, closed: 1 });
  });
  it("all tab matches everything", () => {
    expect(matchesTab("rejected", "all")).toBe(true);
    expect(matchesTab("rejected", "active")).toBe(false);
  });
  it("pending offer is the top next step", () => {
    expect(nextStep("interviewing", true, true)).toBe("Review your offer");
    expect(nextStep("interviewing", true, false)).toBe("Interview scheduled");
  });
});

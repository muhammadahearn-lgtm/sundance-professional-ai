import { describe, expect, it } from "vitest";
import { REVIEW_TTL_DAYS, hashToken, isExpired, newReviewToken, validPick } from "./team-review";

describe("team review links", () => {
  it("expire after 14 days", () => {
    expect(REVIEW_TTL_DAYS).toBe(14);
    const now = new Date("2026-10-09T00:00:00Z");
    expect(isExpired("2026-10-08T23:59:59Z", now)).toBe(true);
    expect(isExpired("2026-10-23T00:00:00Z", now)).toBe(false);
  });
  it("only accept a shared candidate or 'none of these'", () => {
    expect(validPick("a", ["a", "b"])).toBe(true);
    expect(validPick(null, ["a", "b"])).toBe(true);
    expect(validPick("z", ["a", "b"])).toBe(false);
  });
  it("tokens are unique and stored only as a hash", async () => {
    const t = newReviewToken();
    expect(t).not.toBe(newReviewToken());
    const h = await hashToken(t);
    expect(h).toHaveLength(64);
    expect(h).not.toContain(t);
  });
});

import { feedbackNoteText as fnt, isVerdict as iv, verdictLabel as vl } from "./team-review";
describe("profile review feedback", () => {
  it("accepts only the four verdicts", () => {
    expect(["strong_yes", "yes", "hold", "pass"].every(iv)).toBe(true);
    expect(iv("maybe")).toBe(false);
  });
  it("labels the verdict and attributes the reviewer in the note", () => {
    expect(vl("strong_yes")).toBe("Strong Yes");
    expect(fnt("Jane Doe", "Eng Manager", "hold", " Check system design ")).toBe("Hiring manager feedback from Jane Doe (Eng Manager) via review link — Hold\nCheck system design");
  });
});

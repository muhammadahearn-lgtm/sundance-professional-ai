import { describe, it, expect } from "vitest";
import { DEFAULT_PLAN, normalizePlan, resizePlan, validatePlan, roundProgress, nextPendingRound } from "./interview-plan";

const NOW = new Date("2026-10-09T12:00:00Z").getTime();
const iv = (id: string, round: number, at: string) => ({ interview_id: id, round_number: round, interview_type: "screen", custom_round_name: "", scheduled_at: at, duration_minutes: 30, status: "scheduled" });

describe("interview plan", () => {
  it("defaults to 3 rounds", () => {
    expect(normalizePlan(null)).toHaveLength(3);
    expect(DEFAULT_PLAN.map((r) => r.name)).toEqual(["Initial Screen", "Technical Deep Dive", "Final Round"]);
  });
  it("allows 1 to 5 rounds only", () => {
    expect(resizePlan(DEFAULT_PLAN, 9)).toHaveLength(5);
    expect(resizePlan(DEFAULT_PLAN, 0)).toHaveLength(1);
    expect(validatePlan([])).not.toBeNull();
  });
  it("requires a name on each round", () => {
    expect(validatePlan([{ type: "custom", name: " ", duration_minutes: 30 }])).toBe("Name round 1.");
  });
  it("hire scorecard = passed, no scorecard after the call = awaiting, future = scheduled", () => {
    const ivs = [iv("a", 1, "2026-10-01T10:00:00Z"), iv("b", 2, "2026-10-08T10:00:00Z"), iv("c", 3, "2026-10-20T10:00:00Z")];
    const s = roundProgress(DEFAULT_PLAN, ivs, [{ interview_id: "a", recommendation: "strong_hire", rating: 5 }], NOW);
    expect(s.map((x) => x.state)).toEqual(["passed", "awaiting_scorecard", "scheduled"]);
  });
  it("no-hire scorecard is flagged and unscheduled rounds are next", () => {
    const s = roundProgress(DEFAULT_PLAN, [iv("a", 1, "2026-10-01T10:00:00Z")], [{ interview_id: "a", recommendation: "leaning_no", rating: 2 }], NOW);
    expect(s[0]!.state).toBe("concern");
    expect(nextPendingRound(s)?.round).toBe(2);
  });
});

import { compareByInterview as cmpIv } from "./interview-plan";
describe("compareByInterview", () => {
  const p = (scored: number, passed: number, concerns: number, avg: number | null) => ({ scored, passed, concerns, avg });
  it("ranks 3 passed rounds at 4.3 above 1 passed round at 5.0", () => expect(cmpIv(p(3, 3, 0, 4.3), p(1, 1, 0, 5))).toBeLessThan(0));
  it("ranks a candidate with a concern below one without", () => expect(cmpIv(p(3, 2, 1, 4.8), p(2, 2, 0, 3.5))).toBeGreaterThan(0));
  it("breaks equal rounds by higher average rating", () => expect(cmpIv(p(2, 2, 0, 4.5), p(2, 2, 0, 4))).toBeLessThan(0));
  it("puts unscored candidates last", () => expect(cmpIv(p(0, 0, 0, null), p(1, 0, 1, 2))).toBeGreaterThan(0));
});

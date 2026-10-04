import { describe, expect, it } from "vitest";
import { recTier, recommendJobs, recommendPipeline, recommendCandidates, recommendHiring } from "./recommend-engine";

const det = (req: string[]) => ({ strengths: [], missing: { languages: [], skills: [], technologies: [], requiredMissing: req }, experienceGap: 0, recommendations: [] });

describe("recommendation engine", () => {
  it("uses the spec tiers", () => {
    expect(recTier(90).label).toBe("Highly Recommended");
    expect(recTier(75).label).toBe("Strong Recommendation");
    expect(recTier(60).label).toBe("Moderate Recommendation");
    expect(recTier(59).label).toBe("Low Priority");
  });
  it("skips applied jobs and ranks by score", () => {
    const base = { title: "", company: "", location: "", salary: "", saved: false, applied: false };
    const r = recommendJobs([
      { ...base, jobId: "a", overall: 80, details: det(["Python"]) },
      { ...base, jobId: "b", overall: 80, details: det([]) },
      { ...base, jobId: "c", overall: 99, details: det([]), applied: true },
    ], 50);
    expect(r.map((x) => x.jobId)).toEqual(["b", "a"]);
    expect(r[0]!.score).toBe(83);
  });
  it("flags candidates stalled 21+ days", () => {
    const now = new Date("2026-10-30");
    const r = recommendPipeline([{ pipelineId: "p", candidateId: "c", name: "A", jobTitle: "J", stage: "contacted", stageDate: "2026-10-01", match: 80 }], now);
    expect(r[0]!.title).toBe("Close Stalled Candidate");
  });
  it("skips candidates already in the pipeline", () => {
    const b = { name: "", role: "", skills: [], availability: "", jobTitle: "", details: null, applied: false, saved: false };
    const r = recommendCandidates([{ ...b, candidateId: "x", jobId: "j", overall: 90, inPipeline: true }]);
    expect(r).toEqual([]);
  });
  it("suggests remote for on-site jobs with a thin pool", () => {
    const r = recommendHiring([{ jobId: "j", title: "T", arrangement: "on_site", location: "Boston", minYears: 2, maxSalary: null, descriptionLength: 900, scores: [], marketMaxSalary: null }]);
    expect(r.map((x) => x.title)).toContain("Add Remote Option");
  });
});

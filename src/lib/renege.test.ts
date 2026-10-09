import { describe, it, expect } from "vitest";
import { canReportRenege, fastTrackCandidates, renegeReasonLabel } from "./renege";

describe("renege", () => {
  it("only hired, not-yet-reneged cards can be reported", () => {
    expect(canReportRenege("hired")).toBe(true);
    expect(canReportRenege("offer")).toBe(false);
    expect(canReportRenege("hired", "2026-10-01")).toBe(false);
  });
  it("labels reasons", () => { expect(renegeReasonLabel("counter_offer")).toBe("Accepted a counter-offer"); expect(renegeReasonLabel("x")).toBe("Backed out"); });
  it("fast-track lists closed-out runners-up, silver medalists first, excluding withdrawals and the reneging hire", () => {
    const cards = [
      { candidate_id: "a", current_stage: "rejected" },
      { candidate_id: "b", current_stage: "rejected" },
      { candidate_id: "c", current_stage: "rejected", withdrawnAt: "2026-01-01" },
      { candidate_id: "d", current_stage: "interviewing" },
      { candidate_id: "h", current_stage: "rejected", renegedAt: "2026-01-02" },
    ];
    expect(fastTrackCandidates(cards, "h", new Set(["b"])).map((c) => c.candidate_id)).toEqual(["b", "a"]);
  });
});

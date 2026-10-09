import { describe, expect, it } from "vitest";
import { canUndoMove, hireCheck, skippedStages } from "./stage-moves";

describe("pipeline human-error guards", () => {
  it("only an accepted offer allows a direct move to Hired", () => {
    expect(hireCheck("accepted")).toBe("ok");
    expect(hireCheck("pending")).toBe("pending_offer");
    expect(hireCheck(null)).toBe("no_offer");
    expect(hireCheck("declined")).toBe("no_offer");
  });
  it("flags skipped stages on forward jumps", () => {
    expect(skippedStages("contacted", "offer")).toEqual(["Interviewing", "Shortlisted"]);
    expect(skippedStages("contacted", "interviewing")).toEqual([]);
    expect(skippedStages("offer", "contacted")).toEqual([]);
  });
  it("undo only for working-stage moves", () => {
    expect(canUndoMove("contacted", "interviewing")).toBe(true);
    expect(canUndoMove("offer", "hired")).toBe(false);
    expect(canUndoMove("shortlisted", "rejected")).toBe(false);
  });
});

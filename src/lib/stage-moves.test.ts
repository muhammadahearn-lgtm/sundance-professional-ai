import { describe, expect, it } from "vitest";
import { canMoveCard, isBackwardMove, moveToast, needsOfferWithdrawal, shouldAutoSchedule } from "./stage-moves";

describe("pipeline stage moves", () => {
  it("detects backward moves", () => {
    expect(isBackwardMove("shortlisted", "interviewing")).toBe(true);
    expect(isBackwardMove("contacted", "interviewing")).toBe(false);
    expect(isBackwardMove("offer", "rejected")).toBe(false);
  });
  it("locks hired candidates", () => { expect(canMoveCard("hired")).toBe(false); expect(canMoveCard("offer")).toBe(true); });
  it("auto-schedules only on forward entry without a booking", () => {
    expect(shouldAutoSchedule("contacted", "interviewing", false)).toBe(true);
    expect(shouldAutoSchedule("shortlisted", "interviewing", false)).toBe(false);
    expect(shouldAutoSchedule("contacted", "interviewing", true)).toBe(false);
  });
  it("requires withdrawing a pending offer when leaving Offer", () => {
    expect(needsOfferWithdrawal("offer", "shortlisted", "pending")).toBe(true);
    expect(needsOfferWithdrawal("offer", "rejected", "pending")).toBe(true);
    expect(needsOfferWithdrawal("offer", "shortlisted", "withdrawn")).toBe(false);
    expect(needsOfferWithdrawal("offer", "hired", "pending")).toBe(false);
  });
  it("uses directional toasts", () => {
    expect(moveToast("shortlisted", "interviewing")).toBe("Moved back to Interviewing");
    expect(moveToast("contacted", "interviewing")).toBe("Advanced to Interviewing");
  });
});

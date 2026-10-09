import { describe, expect, it } from "vitest";
import { canWithdraw, withdrawReasonLabel } from "./withdrawal";

describe("candidate withdrawal", () => {
  it("allowed at active stages including interviewing and offer", () => {
    expect(canWithdraw("applied")).toBe(true);
    expect(canWithdraw("interviewing")).toBe(true);
    expect(canWithdraw("offer")).toBe(true);
  });
  it("blocked once hired, closed, or already withdrawn", () => {
    expect(canWithdraw("hired")).toBe(false);
    expect(canWithdraw("rejected")).toBe(false);
    expect(canWithdraw("interviewing", "2026-10-09T00:00:00Z")).toBe(false);
  });
  it("labels the accepted-another-offer reason", () => {
    expect(withdrawReasonLabel("accepted_other_offer")).toBe("Accepted another offer");
  });
});

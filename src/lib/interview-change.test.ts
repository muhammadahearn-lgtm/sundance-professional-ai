import { describe, it, expect } from "vitest";
import { canCandidateChange, validateCancelReason } from "./interview-rules";
const now = new Date("2026-10-09T12:00:00Z");
describe("candidate interview changes", () => {
  it("allows upcoming scheduled interviews", () => expect(canCandidateChange({ scheduled_at: "2026-10-10T12:00:00Z", status: "scheduled" }, now)).toBe(true));
  it("blocks interviews that already started", () => expect(canCandidateChange({ scheduled_at: "2026-10-09T11:00:00Z", status: "scheduled" }, now)).toBe(false));
  it("blocks cancelled interviews", () => expect(canCandidateChange({ scheduled_at: "2026-10-10T12:00:00Z", status: "cancelled" }, now)).toBe(false));
  it("requires a cancel reason of 3-500 chars", () => {
    expect(validateCancelReason("  ")).not.toBeNull();
    expect(validateCancelReason("x".repeat(501))).not.toBeNull();
    expect(validateCancelReason("Sick")).toBeNull();
  });
});

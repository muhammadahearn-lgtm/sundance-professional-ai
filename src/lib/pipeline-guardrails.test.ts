import { describe, expect, it } from "vitest";
import { overOfferWarning, salaryWarning } from "./pipeline-guardrails";

describe("pipeline guardrails", () => {
  it("warns when pending offers already cover the open spots", () => {
    expect(overOfferWarning(1, 0, 1)).not.toBeNull();
    expect(overOfferWarning(1, 0, 0)).toBeNull();
    expect(overOfferWarning(3, 1, 1)).toBeNull();
    expect(overOfferWarning(1, 1, 0)).not.toBeNull();
  });
  it("flags a missing or extra zero against the posted range", () => {
    expect(salaryWarning(15000, 130000, 160000, "USD")).not.toBeNull();
    expect(salaryWarning(1500000, 130000, 160000, "USD")).not.toBeNull();
    expect(salaryWarning(150000, 130000, 160000, "USD")).toBeNull();
    expect(salaryWarning(150000, null, null, "USD")).toBeNull();
  });
});

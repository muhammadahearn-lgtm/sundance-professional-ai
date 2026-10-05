import { describe, expect, it } from "vitest";
import { canRestrict, validateReport } from "./reports";

describe("reports", () => {
  it("requires a known reason", () => expect(validateReport("", "")).toBe("Choose a reason."));
  it("requires details for 'other'", () => expect(validateReport("other", "  ")).toBe("Tell us what's wrong."));
  it("accepts a plain reason without details", () => expect(validateReport("scam", "")).toBeNull());
  it("rejects details over 1000 characters", () => expect(validateReport("spam", "x".repeat(1001))).not.toBeNull());
  it("only jobs and accounts can be restricted", () => {
    expect(canRestrict("job")).toBe(true);
    expect(canRestrict("user")).toBe(true);
    expect(canRestrict("company")).toBe(false);
    expect(canRestrict("message")).toBe(false);
  });
});

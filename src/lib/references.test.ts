import { describe, expect, it } from "vitest";
import { canRequestReferences, referenceProgress, validateReferences } from "./references";

const ref = (email: string) => ({ name: "A", email, relationship: "manager", company: "", workedTogether: "" });

describe("reference checks", () => {
  it("only offered in interviewing, shortlisted or offer", () => {
    expect(canRequestReferences("shortlisted")).toBe(true);
    expect(canRequestReferences("contacted")).toBe(false);
    expect(canRequestReferences("hired")).toBe(false);
  });
  it("requires exactly the requested count", () => {
    expect(validateReferences([ref("a@x.com")], 2)).toMatch(/exactly 2/);
    expect(validateReferences([ref("a@x.com"), ref("b@x.com")], 2)).toBeNull();
  });
  it("rejects duplicate emails and the candidate's own email", () => {
    expect(validateReferences([ref("a@x.com"), ref("A@x.com")], 2)).toMatch(/different/);
    expect(validateReferences([ref("me@x.com")], 1, "me@x.com")).toMatch(/yourself/);
  });
  it("progress shows completed of target", () => {
    expect(referenceProgress(2, 1, "in_progress")).toEqual({ label: "References: 1/2", done: false });
    expect(referenceProgress(2, 2, "completed").done).toBe(true);
  });
});

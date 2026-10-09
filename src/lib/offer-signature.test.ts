import { describe, it, expect } from "vitest";
import { signatureError, normalizeSignature } from "./offer-rules";
import { offerLetterRows } from "./offer-letter";
describe("offer signature", () => {
  it("rejects a single name", () => expect(signatureError("Umar")).not.toBeNull());
  it("accepts first and last name", () => expect(signatureError("Umar Iyer")).toBeNull());
  it("collapses whitespace", () => expect(normalizeSignature("  Umar   Iyer ")).toBe("Umar Iyer"));
  it("prints signer on the confirmation", () => {
    const rows = offerLetterRows({ offerId: "abcdef1234", candidateName: "Umar Iyer", jobTitle: "DE", companyName: "", salaryAmount: 1, currency: "USD", signingBonus: null, equity: "", startDate: null, notes: "", revision: 1, respondedAt: null, status: "accepted", signedName: "Umar Iyer", signedAt: "2026-10-09T20:00:00Z" });
    expect(rows.find(([k]) => k === "Signed by")?.[1]).toBe("Umar Iyer");
  });
});

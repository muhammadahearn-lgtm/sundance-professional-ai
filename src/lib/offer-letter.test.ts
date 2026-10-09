import { describe, expect, it } from "vitest";
import { canDownloadOfferLetter, offerLetterRows } from "./offer-letter";
describe("offer confirmation", () => {
  it("is only available for accepted offers with a decision time", () => {
    expect(canDownloadOfferLetter({ status: "accepted", responded_at: "2026-10-01T10:00:00Z" })).toBe(true);
    expect(canDownloadOfferLetter({ status: "pending", responded_at: null })).toBe(false);
    expect(canDownloadOfferLetter({ status: "declined", responded_at: "2026-10-01T10:00:00Z" })).toBe(false);
  });
  it("prints agreed salary as symbol only and omits empty bonus", () => {
    const rows = offerLetterRows({ offerId: "abcdef1234", candidateName: "Umar Iyer", jobTitle: "Senior Data Engineer", companyName: "Sundance", salaryAmount: 300000, currency: "USD", signingBonus: null, equity: "", startDate: "2026-11-02", notes: "", revision: 2, respondedAt: "2026-10-01T10:00:00Z", status: "accepted" });
    expect(rows.find((r) => r[0] === "Base salary")?.[1]).toBe("$300,000");
    expect(rows.some((r) => r[0] === "Signing bonus")).toBe(false);
    expect(rows.find((r) => r[0] === "Confirmation ID")?.[1]).toBe("ABCDEF12");
  });
});

import { describe, expect, it } from "vitest";
import { daysLeft, emptyOffer, offerExpired, toOfferRow, validateOffer } from "./offer-rules";

const today = "2026-10-07";
describe("offer rules", () => {
  it("requires a base salary", () => expect(validateOffer(emptyOffer(), today).salary).toBeTruthy());
  it("accepts a valid offer", () => expect(validateOffer({ ...emptyOffer(), salary: "150000", startDate: "2026-11-01", expiresOn: "2026-10-14" }, today)).toEqual({}));
  it("rejects past start dates and deadlines", () => {
    const e = validateOffer({ ...emptyOffer(), salary: "1", startDate: "2026-10-01", expiresOn: "2026-10-06" }, today);
    expect(e.startDate).toBeTruthy(); expect(e.expiresOn).toBeTruthy();
  });
  it("expires only after the deadline day", () => { expect(offerExpired("2026-10-07", today)).toBe(false); expect(offerExpired("2026-10-06", today)).toBe(true); });
  it("counts days left", () => expect(daysLeft("2026-10-14", today)).toBe(7));
  it("strips formatting from amounts", () => expect(toOfferRow({ ...emptyOffer(), salary: "$150,000" }).salary_amount).toBe(150000));
});

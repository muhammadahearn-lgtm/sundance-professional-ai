import { describe, expect, it } from "vitest";
import { companyKey, newCompanyName } from "./company-add";

describe("company governance", () => {
  it("treats legal suffixes, case and punctuation as the same company", () => {
    expect(companyKey("Acme, Inc.")).toBe(companyKey("acme"));
    expect(companyKey("ACME LLC")).toBe(companyKey("Acme"));
  });
  it("does not offer adding a company that already exists", () => {
    expect(newCompanyName("acme corp", [{ name: "Acme" }])).toBeNull();
  });
  it("offers a genuinely new company", () => {
    expect(newCompanyName("  Starlight   Robotics ", [{ name: "Acme" }])).toBe("Starlight Robotics");
  });
});

import { describe, expect, it } from "vitest";
import { CURRENCIES, formatSalaryAmount, formatSalaryRange, parseSalaryInput } from "./salary";

describe("salary standard", () => {
  it("supports the seven currencies", () => expect([...CURRENCIES]).toEqual(["USD", "CAD", "EUR", "GBP", "AUD", "SGD", "IDR"]));
  it("accepts plain numbers", () => expect(parseSalaryInput("60000")).toEqual({ ok: true, value: 60000 }));
  it("rejects free-form salary text", () => {
    for (const bad of ["$60K", "60k", "USD 60000", "$120,000", "120.000", "100K - 150K"]) expect(parseSalaryInput(bad).ok).toBe(false);
  });
  it("formats a single amount", () => expect(formatSalaryAmount(60000, "USD")).toBe("$60,000 USD"));
  it("formats a range", () => expect(formatSalaryRange(120000, 150000, "USD")).toBe("$120,000 - $150,000 USD"));
});

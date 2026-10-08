import { describe, expect, it } from "vitest";
import { buildCompareSummary, shortName } from "./compare-share";

describe("compare share", () => {
  it("uses first name and last initial only", () => {
    expect(shortName("Muhammad", "Ahearn")).toBe("Muhammad A.");
  });
  it("never includes emails or full last names", () => {
    const out = buildCompareSummary("Engineer", [{ firstName: "Ana", lastName: "Lopez", jobTitle: "Dev", years: 5, score: 80, strengths: ["React"] }]);
    expect(out).not.toContain("Lopez");
    expect(out).not.toContain("@");
  });
  it("ranks highest match first", () => {
    const out = buildCompareSummary("Engineer", [
      { firstName: "Low", lastName: "X", jobTitle: "", years: 1, score: 40, strengths: [] },
      { firstName: "High", lastName: "Y", jobTitle: "", years: 1, score: 90, strengths: [] },
    ]);
    expect(out.indexOf("High")).toBeLessThan(out.indexOf("Low"));
  });
});

import { describe, expect, it } from "vitest";
import { matchSummary, nextSteps } from "./match-explain";

const base = { strengths: [], missing: { languages: [], skills: [], technologies: [], requiredMissing: [] as string[] }, experienceGap: 0, recommendations: [] };

describe("match explanation", () => {
  it("names missing required items in the summary", () => {
    const d = { ...base, missing: { ...base.missing, skills: ["Docker", "AWS"], requiredMissing: ["Docker", "AWS"] } };
    expect(matchSummary(78, d)).toBe("Strong match because you meet the experience requirement. Add Docker and AWS to improve.");
  });
  it("lists required gaps before other gaps and caps at 4", () => {
    const d = { ...base, missing: { languages: ["Go"], skills: ["Docker", "Kafka"], technologies: ["AWS"], requiredMissing: ["Docker"] }, experienceGap: 2 };
    const s = nextSteps(d);
    expect(s).toHaveLength(4);
    expect(s[0]).toContain("Docker");
    expect(s[1]).toContain("2 more years");
  });
});

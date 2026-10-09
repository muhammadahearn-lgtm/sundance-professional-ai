import { describe, it, expect } from "vitest";
import { normalizePlan, normalizeRubric, resizePlan, DEFAULT_PLAN } from "./interview-plan";

describe("interview kits", () => {
  it("caps rubric at 5 items and drops blanks/duplicates", () => {
    expect(normalizeRubric(["A", " ", "a", "B", "C", "D", "E", "F"])).toEqual(["A", "B", "C", "D", "E"]);
  });
  it("keeps old plans without kits valid", () => {
    const p = normalizePlan([{ type: "screen", name: "Screen", duration_minutes: 30 }]);
    expect(p[0]!.rubric).toEqual([]);
    expect(p[0]!.focus).toBe("");
  });
  it("default plan ships with suggested criteria", () => {
    expect(DEFAULT_PLAN[0]!.rubric!.length).toBe(3);
  });
  it("added rounds get the suggested kit", () => {
    expect(resizePlan(DEFAULT_PLAN, 4)[3]!.rubric!.length).toBeGreaterThan(0);
  });
});

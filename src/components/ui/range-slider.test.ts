import { describe, it, expect } from "vitest";
import { clampRange } from "./range-slider";
describe("clampRange", () => {
  it("min handle stops before max", () => expect(clampRange([50000, 150000], 0, 300000, 0, 400000, 5000, 5000)).toEqual([145000, 150000]));
  it("max handle stops above min", () => expect(clampRange([50000, 150000], 1, 0, 0, 400000, 5000, 5000)).toEqual([50000, 55000]));
});

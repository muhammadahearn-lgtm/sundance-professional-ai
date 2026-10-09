import { describe, it, expect } from "vitest";
import { openSpots, parseHeadcount } from "./job-rules";
describe("headcount", () => {
  it("defaults to 1 and caps at 99", () => { expect(parseHeadcount("")).toBe(1); expect(parseHeadcount("0")).toBe(1); expect(parseHeadcount("150")).toBe(99); expect(parseHeadcount("3")).toBe(3); });
  it("counts open spots", () => { expect(openSpots(3, 1)).toBe(2); expect(openSpots(3, 3)).toBe(0); expect(openSpots(1, 2)).toBe(0); });
});

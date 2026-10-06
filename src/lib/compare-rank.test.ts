import { describe, expect, it } from "vitest";
import { bestBy, rankCompare } from "./compare-rank";

describe("rankCompare", () => {
  it("picks the highest match score as top pick", () => {
    const r = rankCompare([{ id: "a", score: 70 }, { id: "b", score: 88 }, { id: "c", score: 52 }]);
    expect(r.top?.id).toBe("b");
    expect(r.ranks).toEqual({ b: 1, a: 2, c: 3 });
    expect(r.lead).toBe(18);
  });
  it("ignores items without a score", () => {
    expect(rankCompare([{ id: "a", score: null }, { id: "b", score: 40 }]).top?.id).toBe("b");
  });
  it("breaks ties with the secondary value", () => {
    expect(rankCompare([{ id: "a", score: 80, tie: 3 }, { id: "b", score: 80, tie: 7 }]).top?.id).toBe("b");
  });
});

describe("bestBy", () => {
  it("returns the id with the highest value", () => {
    expect(bestBy([{ i: "x", v: 5 }, { i: "y", v: 9 }], (t) => t.i, (t) => t.v)).toBe("y");
  });
});

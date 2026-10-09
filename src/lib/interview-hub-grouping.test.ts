import { describe, expect, it } from "vitest";
import { dayBucket, groupByDay, needsScorecard } from "./interview-rules";

const now = new Date(2026, 9, 9, 14, 0); // Fri Oct 9 2026, 2pm local
const at = (d: number, h = 10) => new Date(2026, 9, d, h, 0).toISOString();

describe("interview day grouping", () => {
  it("buckets today, tomorrow, this week, later", () => {
    expect(dayBucket(at(9, 16), now)).toBe("Today");
    expect(dayBucket(at(10), now)).toBe("Tomorrow");
    expect(dayBucket(at(15), now)).toBe("This week");
    expect(dayBucket(at(16), now)).toBe("Later");
  });
  it("drops empty groups and keeps order", () => {
    const g = groupByDay([{ scheduled_at: at(9, 16) }, { scheduled_at: at(20) }], now);
    expect(g.map((x) => x.label)).toEqual(["Today", "Later"]);
  });
  it("lists past interviews without a scorecard", () => {
    expect(needsScorecard([{ interview_id: "a" }, { interview_id: "b" }], new Set(["a"])).map((i) => i.interview_id)).toEqual(["b"]);
  });
});

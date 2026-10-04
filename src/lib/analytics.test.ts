import { describe, expect, it } from "vitest";
import { avgDaysToHire, byMonth, conversions, funnel, inWindow, matchDistribution, matchStats, messagingStats, notificationStats, pct, toCsv, windowFor } from "./analytics";

const now = new Date("2026-10-04T12:00:00");

describe("date windows", () => {
  it("last 7 days excludes 8 days ago", () => {
    const w = windowFor("7d", now);
    expect(inWindow("2026-09-30T00:00:00", w)).toBe(true);
    expect(inWindow("2026-09-26T00:00:00", w)).toBe(false);
  });
  it("this year starts Jan 1", () => expect(inWindow("2026-01-01T01:00:00", windowFor("year", now))).toBe(true));
  it("custom range is inclusive of the end day", () => expect(inWindow("2026-09-10T22:00:00", windowFor("custom", now, { from: "2026-09-01", to: "2026-09-10" }))).toBe(true));
});

describe("metrics", () => {
  it("pct handles zero", () => expect(pct(3, 0)).toBe(0));
  it("byMonth buckets the last 6 months", () => {
    const r = byMonth(["2026-10-01T00:00:00", "2026-10-02T00:00:00", "2026-08-15T00:00:00", "2025-01-01T00:00:00"], now);
    expect(r).toHaveLength(6);
    expect(r[5]).toEqual({ month: "Oct", count: 2 });
    expect(r[3]!.count).toBe(1);
  });
  it("match stats", () => expect(matchStats([90, 60, 75])).toEqual({ average: 75, highest: 90, lowest: 60, count: 3 }));
  it("match distribution", () => expect(matchDistribution([95, 80, 61, 10]).map((b) => b.value)).toEqual([1, 1, 1, 1]));
});

describe("hiring funnel", () => {
  const f = funnel([
    { status: "applied", applied: true },
    { status: "interviewing", applied: true },
    { status: "hired", stage: "hired", applied: true },
    { stage: "shortlisted", applied: false },
    { stage: "saved", applied: false },
  ]);
  it("counts furthest progress", () => expect(f.map((x) => x.value)).toEqual([4, 3, 3, 2, 1, 1]));
  it("conversion rates", () => expect(conversions(f).map((c) => c.value)).toEqual([75, 100, 33, 100, 25]));
  it("time to hire in days", () => expect(avgDaysToHire([{ applied: "2026-09-01T00:00:00Z", hired: "2026-09-11T00:00:00Z" }])).toBe(10));
});

describe("messaging and notifications", () => {
  it("response rate and time", () => {
    const s = messagingStats([
      { conversation_id: "a", sender_id: "them", created_at: "2026-10-01T10:00:00Z" },
      { conversation_id: "a", sender_id: "me", created_at: "2026-10-01T12:00:00Z" },
      { conversation_id: "b", sender_id: "them", created_at: "2026-10-01T10:00:00Z" },
    ], "me");
    expect(s).toMatchObject({ sent: 1, received: 2, responseRate: 50, avgResponseHours: 2 });
  });
  it("notification engagement", () => expect(notificationStats([{ status: "read", read_at: "x" }, { status: "unread", read_at: null }])).toEqual({ sent: 2, opened: 1, engagement: 50 }));
});

describe("csv", () => {
  it("escapes commas and blocks formulas", () => expect(toCsv([{ a: "x,y", b: "=SUM(1)" }])).toBe('a,b\n"x,y",\'=SUM(1)'));
});

import { describe, expect, it } from "vitest";
import { careerLevel, careerReport, gaps, impactOf, readiness, readinessTier, salaryIntel, type CareerCandidate, type MarketJob } from "./career-engine";

const cand: CareerCandidate = { title: "Data Engineer", years: 5, location: "Austin, TX", targetRoles: ["Data Engineer"], roleId: null, langs: ["py"], skills: ["etl"], techs: ["aws"], certifications: [], completion: 80 };
const job = (id: string, extra: Partial<MarketJob> = {}): MarketJob => ({ id, title: "Senior Data Engineer", roleId: null, minSalary: 100000, maxSalary: 140000, minYears: 5, langs: [{ id: "py", level: "required" }], skills: [{ id: "etl", level: "required" }], techs: [{ id: "aws", level: "required" }, { id: "kafka", level: "required" }], ...extra });

describe("career engine", () => {
  it("tiers: 90 industry ready, 80 highly competitive, 70 competitive, 60 developing, 59 needs improvement", () => {
    expect([90, 80, 70, 60, 59].map(readinessTier)).toEqual(["Industry Ready", "Highly Competitive", "Competitive", "Developing", "Needs Improvement"]);
  });
  it("readiness = 20% completion + 25% skills + 20% tech + 25% experience + 10% certifications", () => {
    const r = readiness(cand, [{ jobId: "a", overall: 80, skills: 100, technologies: 50, experience: 100 }]);
    expect(r.score).toBe(Math.round((80 * 20 + 100 * 25 + 50 * 20 + 100 * 25 + 0 * 10) / 100));
  });
  it("adding a required tech worth half the tech requirements gains ~10 match points", () => {
    expect(impactOf("kafka", "technology", [job("a")])).toBe(10);
  });
  it("technology gaps list Kafka as high impact", () => {
    const g = gaps(cand, [job("a"), job("b")], "technology", { kafka: "Kafka" });
    expect(g.map((x) => [x.name, x.level])).toEqual([["Kafka", "High"]]);
  });
  it("salary: equal experience keeps market range, stretch is +10%", () => {
    const s = salaryIntel(cand, [job("a")])!;
    expect([s.marketLow, s.marketHigh, s.expected[0], s.expected[1], s.stretch]).toEqual([100000, 140000, 100000, 140000, 154000]);
  });
  it("roadmap climbs from current level", () => {
    expect(careerLevel("Data Engineer", 5)).toBe(2);
    const r = careerReport(cand, [job("a")], [], { kafka: "Kafka" });
    expect(r.roadmap.map((s) => s.role)).toEqual(["Data Engineer", "Lead Data Engineer", "Principal Data Engineer"]);
    expect(r.roadmap[1]!.technologies).toEqual(["Kafka"]);
  });
});

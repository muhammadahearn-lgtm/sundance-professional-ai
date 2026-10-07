import { describe, expect, it } from "vitest";
import { marketPulse } from "./market-pulse";

const now = new Date("2026-10-07T00:00:00Z").getTime();
const ago = (d: number) => new Date(now - d * 86_400_000).toISOString();
const names = { py: "Python", k8s: "Kubernetes" };

describe("marketPulse", () => {
  const jobs = [
    { publishedAt: ago(5), roleId: "r", minSalary: 100, maxSalary: 200, reqIds: ["py", "k8s"] },
    { publishedAt: ago(10), roleId: "r", minSalary: 200, maxSalary: 200, reqIds: ["py"] },
    { publishedAt: ago(40), roleId: "r", minSalary: 100, maxSalary: 100, reqIds: ["py"] },
    { publishedAt: ago(90), roleId: "r", minSalary: 1, maxSalary: 1, reqIds: ["k8s"] },
  ];
  const p = marketPulse(jobs, { roleId: "r", ids: ["py"] }, names, now);
  it("splits last 30 days from the 30 before", () => { expect(p.newJobs).toBe(2); expect(p.prevJobs).toBe(1); });
  it("computes demand change", () => { expect(p.rising[0]).toMatchObject({ name: "Python", now: 2, prev: 1, change: 100, youHave: true }); });
  it("median pay uses salary midpoints of the candidate's role", () => { expect(p.medianPay).toBe(175); expect(p.prevMedianPay).toBe(100); });
  it("coverage is share of top items candidate has", () => { expect(p.coverage).toBe(50); });
});

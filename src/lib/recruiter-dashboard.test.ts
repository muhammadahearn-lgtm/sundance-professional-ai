import { describe, expect, it } from "vitest";
import { appWindows, jobStatusCounts, recruiterKpis, stageCounts } from "./recruiter-dashboard";

const jobs = [{ job_id: "1", job_status: "active" }, { job_id: "2", job_status: "active" }, { job_id: "3", job_status: "draft" }];
const apps = [{ application_date: "2026-10-03T00:00:00Z", application_status: "applied", job_id: "1" }, { application_date: "2026-09-20T00:00:00Z", application_status: "hired", job_id: "1" }];
const pipe = ["saved", "interviewing", "interviewing", "offer", "hired", "rejected"].map((current_stage) => ({ current_stage }));

describe("recruiter dashboard", () => {
  it("KPIs come from jobs, applications and pipeline", () => {
    expect(recruiterKpis(jobs, apps, pipe)).toEqual({ activeJobs: 2, applications: 2, inPipeline: 4, interviewing: 2, offers: 1, hires: 1 });
  });
  it("counts jobs per status", () => {
    expect(jobStatusCounts(jobs).map((x) => x.n)).toEqual([1, 2, 0, 0]);
  });
  it("counts all 7 pipeline stages", () => {
    expect(stageCounts(pipe).find((s) => s.key === "interviewing")?.n).toBe(2);
    expect(stageCounts(pipe)).toHaveLength(7);
  });
  it("week is last 7 days, month is calendar month", () => {
    expect(appWindows(apps, new Date("2026-10-04T00:00:00Z"))).toEqual({ week: 1, month: 1 });
  });
});

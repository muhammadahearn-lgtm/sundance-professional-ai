import { describe, expect, it } from "vitest";
import { filterCompanyJobs, summarizeCompany, type CompanyJob } from "./company-admin";

const j = (o: Partial<CompanyJob>): CompanyJob => ({
  job_id: "x", job_title: "Engineer", job_status: "active", recruiter_id: "r1", recruiter_name: "A", created_at: "", published_at: null, applicants: 0,
  saved: 0, contacted: 0, interviewing: 0, shortlisted: 0, offer: 0, hired: 0, rejected: 0, ...o,
});

describe("summarizeCompany", () => {
  const jobs = [j({ applicants: 4, interviewing: 2, rejected: 1, hired: 1 }), j({ job_status: "draft", recruiter_id: "r2", contacted: 3 }), j({ job_status: "closed", hired: 2 })];
  const s = summarizeCompany(jobs);
  it("counts jobs by status", () => expect([s.totalJobs, s.activeJobs, s.draftJobs, s.closedJobs]).toEqual([3, 1, 1, 1]));
  it("counts hires across all company jobs", () => expect(s.hired).toBe(3));
  it("leaves rejected candidates out of the active pipeline", () => expect(s.inPipeline).toBe(8));
  it("counts distinct recruiters posting", () => expect(s.recruiters).toBe(2));
});

describe("filterCompanyJobs", () => {
  const jobs = [j({ job_id: "1", job_title: "Data Scientist" }), j({ job_id: "2", recruiter_id: "r2", job_status: "closed" })];
  it("filters by recruiter", () => expect(filterCompanyJobs(jobs, { status: "all", recruiter: "r2", q: "" }).map((x) => x.job_id)).toEqual(["2"]));
  it("filters by status and title", () => expect(filterCompanyJobs(jobs, { status: "active", recruiter: "all", q: "data" }).map((x) => x.job_id)).toEqual(["1"]));
});

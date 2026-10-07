import { describe, expect, it } from "vitest";
import { groupPickerJobs, topPickJob, type PickerJob } from "./saved-candidates";

const jobs: PickerJob[] = [
  { job_id: "1", job_title: "Data Engineer", job_status: "active", company_id: "b", company_name: "Beta" },
  { job_id: "2", job_title: "Backend Lead", job_status: "active", company_id: "a", company_name: "Acme" },
  { job_id: "3", job_title: "Data Scientist", job_status: "paused", company_id: "a", company_name: "Acme" },
];
describe("job picker", () => {
  it("groups by company A–Z", () => expect(groupPickerJobs(jobs, {}).map((g) => g.company)).toEqual(["Acme", "Beta"]));
  it("search matches title or company", () => {
    expect(groupPickerJobs(jobs, { q: "data" }).flatMap((g) => g.jobs.map((j) => j.job_id))).toEqual(["3", "1"]);
    expect(groupPickerJobs(jobs, { q: "beta" }).flatMap((g) => g.jobs.map((j) => j.job_id))).toEqual(["1"]);
  });
  it("company filter", () => expect(groupPickerJobs(jobs, { company: "a" }).length).toBe(1));
  it("top pick is highest-scored active job", () => expect(topPickJob(jobs, { "1": 60, "2": 80, "3": 95 })?.job_id).toBe("2"));
  it("no scores, no pick", () => expect(topPickJob(jobs, {})).toBeNull());
});

import { describe, expect, it } from "vitest";
import { filterHub, sortHub, summarizeJobs, type HubJob } from "./requisition-hub";

const jobs: HubJob[] = [
  { id: "a", title: "Data Engineer", status: "active", location: "", companyId: "c1", company: "Acme" },
  { id: "b", title: "Designer", status: "closed", location: "", companyId: "c2", company: "Beta" },
];

describe("requisition hub", () => {
  it("counts stages and excludes rejected from total", () => {
    const s = summarizeJobs(jobs, [{ job_id: "a", current_stage: "contacted" }, { job_id: "a", current_stage: "rejected" }], []);
    expect(s[0]!.total).toBe(1);
    expect(s[0]!.stages["contacted"]).toBe(1);
  });
  it("flags negotiating pending offers", () => {
    const s = summarizeJobs(jobs, [], [{ job_id: "a", status: "pending", negotiated_at: "2026-01-01" }]);
    expect(s[0]!.negotiating).toBe(1);
  });
  it("active filter hides closed jobs", () => {
    expect(filterHub(summarizeJobs(jobs, [], []), { q: "", co: "", status: "active" }).map((j) => j.id)).toEqual(["a"]);
  });
  it("sorts jobs needing attention first", () => {
    const s = summarizeJobs(jobs, [], [{ job_id: "b", status: "pending", negotiated_at: null }]);
    expect(sortHub(s)[0]!.id).toBe("b");
  });
});

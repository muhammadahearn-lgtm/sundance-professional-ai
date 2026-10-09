import { describe, expect, it } from "vitest";
import { filterAppReqs, sortAppReqs, summarizeApplications, type AppReqRow } from "./application-requisitions";

const row = (p: Partial<AppReqRow>): AppReqRow => ({ job_id: "j1", candidate_id: "c", application_status: "applied", application_date: "2026-10-01", title: "Engineer", jobStatus: "active", location: "", company: "Acme", ...p });

describe("application requisitions", () => {
  it("counts in-pipeline applicants as reviewed, not unreviewed", () => {
    const [j] = summarizeApplications([row({ candidate_id: "a" }), row({ candidate_id: "b" }), row({ candidate_id: "c", application_status: "rejected" })], (r) => r.candidate_id === "b", () => undefined);
    expect(j).toMatchObject({ total: 3, unreviewed: 1, inPipeline: 1, archived: 1 });
  });
  it("keeps the highest match score and latest date", () => {
    const [j] = summarizeApplications([row({ candidate_id: "a", application_date: "2026-10-02" }), row({ candidate_id: "b", application_date: "2026-10-05" })], () => false, (r) => (r.candidate_id === "a" ? 91 : 70));
    expect(j.topMatch).toBe(91);
    expect(j.latest).toBe("2026-10-05");
  });
  it("sorts jobs with the most unreviewed applicants first", () => {
    const list = summarizeApplications([row({ job_id: "x" }), row({ job_id: "y" }), row({ job_id: "y", candidate_id: "d" })], () => false, () => undefined);
    expect(sortAppReqs(list).map((j) => j.id)).toEqual(["y", "x"]);
  });
  it("hides closed jobs from the Open tab", () => {
    const list = summarizeApplications([row({ job_id: "x", jobStatus: "closed" }), row({ job_id: "y" })], () => false, () => undefined);
    expect(filterAppReqs(list, { q: "", co: "", status: "active" }).map((j) => j.id)).toEqual(["y"]);
  });
});

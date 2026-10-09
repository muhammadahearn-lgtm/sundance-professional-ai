import { describe, expect, it } from "vitest";
import { UNASSIGNED, filterSaved, sortSaved, type SavedItem } from "./saved-candidates";

const items: SavedItem[] = [
  { id: "a", name: "Zoe", years: 3, savedDate: "2026-10-01", jobId: "j1", companyId: "c1", score: 70 },
  { id: "b", name: "Amir", years: 9, savedDate: "2026-10-05", jobId: null, companyId: null, score: null },
  { id: "c", name: "Mia", years: 5, savedDate: "2026-10-03", jobId: "j2", companyId: "c2", score: 90 },
];
const ids = (x: SavedItem[]) => x.map((i) => i.id);

describe("saved candidates", () => {
  it("filters by company", () => expect(ids(filterSaved(items, { company: "c2", job: "" }))).toEqual(["c"]));
  it("filters by job", () => expect(ids(filterSaved(items, { company: "", job: "j1" }))).toEqual(["a"]));
  it("general pool shows only untagged saves", () => expect(ids(filterSaved(items, { company: "", job: UNASSIGNED }))).toEqual(["b"]));
  it("sorts by recent save", () => expect(ids(sortSaved(items, "recent"))).toEqual(["b", "c", "a"]));
  it("sorts by match with unscored last", () => expect(ids(sortSaved(items, "match"))).toEqual(["c", "a", "b"]));
  it("sorts by experience", () => expect(ids(sortSaved(items, "experience"))).toEqual(["b", "c", "a"]));
  it("sorts by name", () => expect(ids(sortSaved(items, "name"))).toEqual(["b", "c", "a"]));
});

import { isSilverEligible as _ise, filterSaved as _fs } from "./saved-candidates";
describe("silver medalists", () => {
  it("only late-stage runners-up are eligible", () => {
    expect(["interviewing", "shortlisted", "offer"].every(_ise)).toBe(true);
    expect(["contacted", "hired", "rejected", null].some(_ise)).toBe(false);
  });
  it("silver filter keeps only silver medalists", () => {
    const base = { years: 1, savedDate: "2026-01-01", jobId: null, companyId: null, score: null };
    const r = _fs([{ ...base, id: "a", name: "A", silver: true }, { ...base, id: "b", name: "B" }], { company: "", job: "", silver: true });
    expect(r.map((x) => x.id)).toEqual(["a"]);
  });
});

import { finalistLabel as _fl, fastTrackJobs as _ftj } from "./saved-candidates";
describe("finalist fast-track", () => {
  const jobs = [{ job_id: "a", job_title: "Data Engineer", job_status: "closed" }, { job_id: "b", job_title: "ML Engineer", job_status: "active" }, { job_id: "c", job_title: "Draft", job_status: "paused" }];
  it("badges silver medalists with the job they were a finalist for", () => {
    expect(_fl({ silver_medalist_job_id: "a" }, jobs)).toBe("Finalist: Data Engineer");
    expect(_fl({ silver_medalist_job_id: null }, jobs)).toBeNull();
  });
  it("fast-track offers only active jobs other than the original", () => {
    expect(_ftj(jobs, "a").map((j) => j.job_id)).toEqual(["b"]);
    expect(_ftj(jobs, "b")).toEqual([]);
  });
});

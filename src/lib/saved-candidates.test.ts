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

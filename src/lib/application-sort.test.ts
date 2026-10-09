import { describe, expect, it } from "vitest";
import { sortApplications } from "./application-sort";

const rows = [
  { id: "a", application_date: "2026-10-01", s: 70 },
  { id: "b", application_date: "2026-10-05", s: 95 },
  { id: "c", application_date: "2026-10-09", s: null },
  { id: "d", application_date: "2026-10-03", s: 95 },
];
const ids = (sort: string) => sortApplications(rows, sort, (r) => r.s).map((r) => r.id);

describe("sortApplications", () => {
  it("puts the highest match score first, ties by newest, unscored last", () => expect(ids("match")).toEqual(["b", "d", "a", "c"]));
  it("sorts lowest score first with unscored last", () => expect(ids("match_low")).toEqual(["a", "b", "d", "c"]));
  it("sorts by newest applied", () => expect(ids("newest")).toEqual(["c", "b", "d", "a"]));
});

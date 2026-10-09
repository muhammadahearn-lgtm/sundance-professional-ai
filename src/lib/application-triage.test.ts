import { describe, expect, it } from "vitest";
import { inTriageTab, triageBucket } from "./application-triage";

describe("application triage", () => {
  it("viewed applicants stay in the Inbox", () => {
    expect(triageBucket("applied", false)).toBe("inbox");
    expect(triageBucket("viewed", false)).toBe("inbox");
  });
  it("moving to the pipeline leaves the Inbox", () => {
    expect(triageBucket("viewed", true)).toBe("pipeline");
    expect(inTriageTab("inbox", "viewed", true)).toBe(false);
  });
  it("not moving forward goes to Archived even if on the board", () => {
    expect(triageBucket("rejected", true)).toBe("archived");
  });
  it("All shows everyone", () => {
    expect(inTriageTab("all", "rejected", false)).toBe(true);
  });
});

import { canBulkSelect, topIds } from "./application-triage";
describe("bulk triage", () => {
  it("only Inbox applicants are selectable", () => {
    expect(canBulkSelect("viewed", false)).toBe(true);
    expect(canBulkSelect("applied", true)).toBe(false);
    expect(canBulkSelect("rejected", false)).toBe(false);
  });
  it("Select Top 5 takes the first 5 eligible in sort order", () => {
    const rows = ["a", "b", "x", "c", "d", "e", "f"].map((id) => ({ id, ok: id !== "x" }));
    expect(topIds(rows, 5, (r) => r.id, (r) => r.ok)).toEqual(["a", "b", "c", "d", "e"]);
  });
});

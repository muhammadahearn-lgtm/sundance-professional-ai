import { describe, expect, it } from "vitest";
import { describeEvent, orderHistory } from "./application-history";

describe("application history", () => {
  it("labels a stage move with where it came from", () => {
    expect(describeEvent({ kind: "stage", detail: "shortlisted from interviewing" })).toMatchObject({ title: "Moved to Shortlisted", sub: "from Interviewing" });
  });
  it("marks rejection with its reason as bad", () => {
    expect(describeEvent({ kind: "status", detail: "rejected · Not enough experience" })).toMatchObject({ title: "Status: Not Moving Forward", sub: "Not enough experience", tone: "bad" });
  });
  it("orders newest first and drops instant duplicates", () => {
    const r = orderHistory([
      { event_id: "1", kind: "applied", detail: "", actor_id: null, occurred_at: "2026-10-01T10:00:00Z" },
      { event_id: "2", kind: "stage", detail: "offer", actor_id: null, occurred_at: "2026-10-05T10:00:00Z" },
      { event_id: "3", kind: "stage", detail: "offer", actor_id: null, occurred_at: "2026-10-05T10:00:01Z" },
    ]);
    expect(r.map((e) => e.event_id)).toEqual(["3", "1"]);
  });
});

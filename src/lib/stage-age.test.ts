import { describe, expect, it } from "vitest";
import { stageAge, STAGES, APP_STATUSES } from "./talent-rules";

describe("pipeline wording and stage aging", () => {
  it("shows Not Moving Forward instead of Rejected", () => {
    expect(STAGES.find(([k]) => k === "rejected")?.[1]).toBe("Not Moving Forward");
    expect(APP_STATUSES.find(([k]) => k === "rejected")?.[1]).toBe("Not Moving Forward");
  });
  it("counts whole days in stage", () => expect(stageAge("2026-10-01T00:00:00Z", new Date("2026-10-04T12:00:00Z")).days).toBe(3));
  it("turns amber at 7 days", () => {
    expect(stageAge("2026-10-01T00:00:00Z", new Date("2026-10-07T23:00:00Z")).stale).toBe(false);
    expect(stageAge("2026-10-01T00:00:00Z", new Date("2026-10-08T00:00:00Z")).stale).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { relativeTime } from "./DraftJobsWidget";
describe("draft last updated", () => {
  const now = new Date("2026-10-05T14:00:00Z");
  it("shows hours ago", () => expect(relativeTime("2026-10-05T12:00:00Z", now)).toBe("2 hours ago"));
  it("shows yesterday", () => expect(relativeTime("2026-10-04T10:00:00Z", now)).toBe("Yesterday"));
});

import { describe, expect, it } from "vitest";
import { detectPlatform, validateInterview, type InterviewDraft } from "./interview-rules";

const now = new Date("2026-10-06T12:00:00");
const base: InterviewDraft = { format: "online", interview_type: "screen", platform: "zoom", meeting_url: "https://zoom.us/j/123", location_address: "", location_instructions: "", date: "2026-10-10", time: "14:00", duration_minutes: 45, timezone: "UTC", notes: "" };

describe("interview rules", () => {
  it("online interviews need an https meeting link", () => {
    expect(validateInterview({ ...base, meeting_url: "" }, now)).toMatch(/meeting link/);
    expect(validateInterview(base, now)).toBeNull();
  });
  it("in-person interviews need an address", () => {
    expect(validateInterview({ ...base, format: "in_person", meeting_url: "" }, now)).toMatch(/address/);
    expect(validateInterview({ ...base, format: "in_person", meeting_url: "", location_address: "100 Main St, Boston" }, now)).toBeNull();
  });
  it("interviews cannot be in the past", () => {
    expect(validateInterview({ ...base, date: "2026-10-01" }, now)).toMatch(/future/);
  });
  it("detects platform from link", () => {
    expect(detectPlatform("https://meet.google.com/abc")).toBe("google_meet");
    expect(detectPlatform("https://teams.microsoft.com/l/x")).toBe("teams");
  });
});

import { countdown, googleCalendarUrl, interviewIcs, splitInterviews } from "./interview-rules";
const iv = { interview_id: "abc", scheduled_at: "2026-10-10T14:00:00Z", duration_minutes: 45, format: "online", meeting_url: "https://zoom.us/j/1", location_address: "", notes: "", status: "scheduled" };
describe("calendar + reminders", () => {
  it("calendar file reminds 1 hour and 15 minutes before", () => {
    const ics = interviewIcs(iv, "Interview");
    expect(ics).toContain("TRIGGER:-PT60M");
    expect(ics).toContain("TRIGGER:-PT15M");
  });
  it("google link carries the exact start/end", () => {
    expect(decodeURIComponent(googleCalendarUrl(iv, "X"))).toContain("20261010T140000Z/20261010T144500Z");
  });
  it("countdown", () => {
    expect(countdown(iv.scheduled_at, 45, new Date("2026-10-10T13:40:00Z"))).toBe("In 20 min");
    expect(countdown(iv.scheduled_at, 45, new Date("2026-10-10T14:10:00Z"))).toBe("Happening now");
  });
  it("in-progress counts as upcoming; cancelled is hidden", () => {
    const r = splitInterviews([iv, { ...iv, interview_id: "c", status: "cancelled" }], new Date("2026-10-10T14:30:00Z"));
    expect(r.upcoming).toHaveLength(1); expect(r.past).toHaveLength(0);
  });
});

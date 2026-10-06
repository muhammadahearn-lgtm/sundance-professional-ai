import { describe, expect, it } from "vitest";
import { detectPlatform, validateInterview, type InterviewDraft } from "./interview-rules";

const now = new Date("2026-10-06T12:00:00");
const base: InterviewDraft = { format: "online", interview_type: "screen", round_number: 1, platform: "zoom", meeting_url: "https://zoom.us/j/123", location_address: "", location_instructions: "", date: "2026-10-10", time: "14:00", duration_minutes: 45, timezone: "UTC", notes: "" };

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

import { nextRound, validateScorecard, roundLabel } from "./interview-rules";
describe("interview rounds", () => {
  it("first interview is Round 1 initial screen", () => expect(nextRound([])).toEqual({ round_number: 1, interview_type: "screen" }));
  it("after Round 1 screen comes Round 2 technical", () => expect(nextRound([{ round_number: 1, interview_type: "screen" }])).toEqual({ round_number: 2, interview_type: "technical" }));
  it("cancelled rounds are ignored", () => expect(nextRound([{ round_number: 1, interview_type: "screen" }, { round_number: 2, interview_type: "technical", status: "cancelled" }]).round_number).toBe(2));
  it("stays on Final Round after the last type", () => expect(nextRound([{ round_number: 5, interview_type: "final" }])).toEqual({ round_number: 6, interview_type: "final" }));
  it("labels rounds", () => expect(roundLabel({ round_number: 3, interview_type: "system_design" })).toBe("Round 3: System Design & Architecture"));
  it("rejects a round outside 1-10", () => expect(validateInterview({ ...base, round_number: 11 }, new Date("2026-01-01"))).toMatch(/Round/));
});
describe("scorecards", () => {
  const ok = { recommendation: "hire", rating: 4, strengths: "", concerns: "", notes: "" };
  it("accepts a valid scorecard", () => expect(validateScorecard(ok)).toBeNull());
  it("needs a recommendation", () => expect(validateScorecard({ ...ok, recommendation: "" })).toMatch(/recommendation/));
  it("rating must be 1-5", () => { expect(validateScorecard({ ...ok, rating: 0 })).toMatch(/rating/); expect(validateScorecard({ ...ok, rating: 6 })).toMatch(/rating/); });
});

import { describe as d2, it as i2, expect as e2 } from "vitest";
import { roundLabel as rl, validateInterview as vi2 } from "./interview-rules";
d2("custom round names", () => {
  const b = { format: "online" as const, interview_type: "custom", round_number: 2, platform: "zoom", meeting_url: "https://zoom.us/j/1", location_address: "", location_instructions: "", date: "2030-10-10", time: "14:00", duration_minutes: 45, timezone: "UTC", notes: "" };
  i2("labels with the custom name", () => e2(rl({ round_number: 2, interview_type: "custom", custom_round_name: " Founder Chat " })).toBe("Round 2: Founder Chat"));
  i2("requires a name for custom rounds", () => e2(vi2({ ...b, custom_round_name: "" })).toBe("Enter a round name."));
  i2("rejects names over 60 characters", () => e2(vi2({ ...b, custom_round_name: "x".repeat(61) })).toBe("Round name must be 60 characters or fewer."));
  i2("accepts a valid custom name", () => e2(vi2({ ...b, custom_round_name: "Portfolio Review" })).toBeNull());
});

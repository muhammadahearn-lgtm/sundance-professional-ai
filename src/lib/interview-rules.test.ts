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

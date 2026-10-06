export type InterviewFormat = "online" | "in_person";
export const INTERVIEW_TYPES: [string, string][] = [["screen", "Initial Screen"], ["technical", "Technical Interview"], ["panel", "Panel / Culture Fit"], ["final", "Final Interview"]];
export const PLATFORMS: [string, string][] = [["google_meet", "Google Meet"], ["zoom", "Zoom"], ["teams", "Microsoft Teams"], ["other", "Other link"]];
export const DURATIONS = [30, 45, 60, 90];

export type InterviewDraft = {
  format: InterviewFormat; interview_type: string; platform: string; meeting_url: string;
  location_address: string; location_instructions: string; date: string; time: string;
  duration_minutes: number; timezone: string; notes: string;
};

/** Returns the first problem, or null when the interview can be saved. */
export function validateInterview(d: InterviewDraft, now = new Date()): string | null {
  if (!d.date || !d.time) return "Pick a date and start time.";
  const at = new Date(`${d.date}T${d.time}`);
  if (isNaN(at.getTime())) return "Pick a valid date and time.";
  if (at.getTime() < now.getTime()) return "The interview time must be in the future.";
  if (d.format === "online" && !/^https:\/\/\S+\.\S+/i.test(d.meeting_url.trim())) return "Add a meeting link starting with https://";
  if (d.format === "in_person" && d.location_address.trim().length < 5) return "Add the interview address.";
  if (d.duration_minutes < 10 || d.duration_minutes > 480) return "Duration must be between 10 and 480 minutes.";
  return null;
}

/** Guess the platform from a pasted link. */
export function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("meet.google.")) return "google_meet";
  if (u.includes("zoom.us")) return "zoom";
  if (u.includes("teams.microsoft.") || u.includes("teams.live.")) return "teams";
  return "other";
}

const pad = (n: number) => String(n).padStart(2, "0");
const icsDate = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const esc = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

export function interviewIcs(i: { interview_id: string; scheduled_at: string; duration_minutes: number; format: string; meeting_url: string; location_address: string; notes: string }, title: string): string {
  const start = new Date(i.scheduled_at); const end = new Date(start.getTime() + i.duration_minutes * 60000);
  const loc = i.format === "online" ? i.meeting_url : i.location_address;
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sundance Professionals//EN", "BEGIN:VEVENT", `UID:${i.interview_id}@sundanceprofessionals.com`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`, `SUMMARY:${esc(title)}`, `LOCATION:${esc(loc)}`, `DESCRIPTION:${esc(i.notes)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

export function fmtInterview(iso: string) {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

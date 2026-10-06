export type InterviewFormat = "online" | "in_person";
/** Standard tech hiring rounds, in their usual order. */
export const INTERVIEW_TYPES: [string, string][] = [["screen", "Initial Screen"], ["technical", "Technical Deep Dive"], ["system_design", "System Design & Architecture"], ["behavioral", "Behavioral & Culture"], ["final", "Final Round"]];
/** Older round names still shown for interviews saved before the rename. */
const LEGACY_TYPES: [string, string][] = [["panel", "Panel / Culture Fit"]];
/** Recruiter-typed round name instead of a preset. */
export const CUSTOM_TYPE = "custom";
export const interviewTypeLabel = (k: string, custom?: string | null) => (k === CUSTOM_TYPE && custom?.trim()) ? custom.trim() : [...INTERVIEW_TYPES, ...LEGACY_TYPES].find(([v]) => v === k)?.[1] ?? (k === CUSTOM_TYPE ? "Custom round" : k);
export const roundName = (i: { interview_type: string; custom_round_name?: string | null }) => interviewTypeLabel(i.interview_type, i.custom_round_name);
export const roundLabel = (i: { round_number?: number | null; interview_type: string; custom_round_name?: string | null }) => `Round ${i.round_number ?? 1}: ${roundName(i)}`;

/** Next round for a candidate: one past the highest round so far, with the next standard type. */
export function nextRound(prior: { round_number?: number | null; interview_type: string; status?: string }[]): { round_number: number; interview_type: string } {
  const live = prior.filter((p) => p.status !== "cancelled");
  if (!live.length) return { round_number: 1, interview_type: "screen" };
  const last = live.reduce((a, b) => ((b.round_number ?? 1) > (a.round_number ?? 1) ? b : a));
  const idx = INTERVIEW_TYPES.findIndex(([k]) => k === last.interview_type);
  const type = INTERVIEW_TYPES[Math.min(idx < 0 ? 1 : idx + 1, INTERVIEW_TYPES.length - 1)]![0];
  return { round_number: Math.min((last.round_number ?? 1) + 1, 10), interview_type: type };
}

export const RECOMMENDATIONS: [string, string][] = [["strong_hire", "Strong Hire"], ["hire", "Hire"], ["leaning_no", "Leaning No"], ["strong_no", "Strong No"]];
export type ScorecardDraft = { recommendation: string; rating: number; strengths: string; concerns: string; notes: string };
/** Returns the first problem, or null when the scorecard can be saved. */
export function validateScorecard(d: ScorecardDraft): string | null {
  if (!RECOMMENDATIONS.some(([k]) => k === d.recommendation)) return "Pick a recommendation.";
  if (!Number.isInteger(d.rating) || d.rating < 1 || d.rating > 5) return "Give a rating from 1 to 5.";
  return null;
}
export const PLATFORMS: [string, string][] = [["google_meet", "Google Meet"], ["zoom", "Zoom"], ["teams", "Microsoft Teams"], ["other", "Other link"]];
export const DURATIONS = [30, 45, 60, 90];

export type InterviewDraft = {
  format: InterviewFormat; interview_type: string; custom_round_name?: string; round_number: number; platform: string; meeting_url: string;
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
  if (!Number.isInteger(d.round_number) || d.round_number < 1 || d.round_number > 10) return "Round must be between 1 and 10.";
  if (d.interview_type === CUSTOM_TYPE && (d.custom_round_name ?? "").trim().length < 2) return "Enter a round name.";
  if ((d.custom_round_name ?? "").trim().length > 60) return "Round name must be 60 characters or fewer.";
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

type CalInterview = { interview_id: string; scheduled_at: string; duration_minutes: number; format: string; meeting_url: string; location_address: string; notes: string };
/** Reminder alarms embedded in every calendar entry (minutes before start). */
export const REMINDER_MINUTES = [60, 15];
const calLoc = (i: CalInterview) => (i.format === "online" ? i.meeting_url : i.location_address);
const calDetails = (i: CalInterview) => [i.format === "online" ? `Join: ${i.meeting_url}` : `Address: ${i.location_address}`, i.notes, "Scheduled via Sundance Professionals"].filter(Boolean).join("\n\n");

export function interviewIcs(i: CalInterview, title: string): string {
  const start = new Date(i.scheduled_at); const end = new Date(start.getTime() + i.duration_minutes * 60000);
  const alarms = REMINDER_MINUTES.flatMap((m) => ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)}`, `TRIGGER:-PT${m}M`, "END:VALARM"]);
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sundance Professionals//EN", "BEGIN:VEVENT", `UID:${i.interview_id}@sundanceprofessionals.com`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`, `SUMMARY:${esc(title)}`, `LOCATION:${esc(calLoc(i))}`, `DESCRIPTION:${esc(calDetails(i))}`, ...alarms, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

/** One-click Google Calendar link (pre-filled, no download). */
export function googleCalendarUrl(i: CalInterview, title: string): string {
  const start = new Date(i.scheduled_at); const end = new Date(start.getTime() + i.duration_minutes * 60000);
  const p = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${icsDate(start)}/${icsDate(end)}`, details: calDetails(i), location: calLoc(i) });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** One-click Outlook web link. */
export function outlookCalendarUrl(i: CalInterview, title: string): string {
  const start = new Date(i.scheduled_at); const end = new Date(start.getTime() + i.duration_minutes * 60000);
  const p = new URLSearchParams({ path: "/calendar/action/compose", rru: "addevent", subject: title, startdt: start.toISOString(), enddt: end.toISOString(), body: calDetails(i), location: calLoc(i) });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`;
}

/** Friendly countdown: "in 2 days", "in 3 hours", "in 20 min", "now", "ended". */
export function countdown(iso: string, durationMin: number, now = new Date()): string {
  const diff = new Date(iso).getTime() - now.getTime();
  if (diff <= 0) return diff > -durationMin * 60000 ? "Happening now" : "Ended";
  const min = Math.round(diff / 60000);
  if (min < 60) return `In ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `In ${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.round(h / 24);
  return `In ${d} day${d === 1 ? "" : "s"}`;
}

/** Splits interviews into upcoming (incl. in progress) and past. */
export function splitInterviews<T extends { scheduled_at: string; duration_minutes: number; status: string }>(list: T[], now = new Date()) {
  const live = list.filter((i) => i.status !== "cancelled");
  const end = (i: T) => new Date(i.scheduled_at).getTime() + i.duration_minutes * 60000;
  return {
    upcoming: live.filter((i) => end(i) > now.getTime()).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    past: live.filter((i) => end(i) <= now.getTime()).sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)),
  };
}

export function fmtInterview(iso: string) {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

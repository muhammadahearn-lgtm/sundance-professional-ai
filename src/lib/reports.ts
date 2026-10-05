export type ReportTarget = "job" | "company" | "message" | "user";
export type ReportReason = "spam" | "scam" | "inappropriate" | "harassment" | "misleading" | "other";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "scam", label: "Scam or fraud" },
  { value: "misleading", label: "Fake or misleading" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Something else" },
];

export const TARGET_LABEL: Record<ReportTarget, string> = { job: "Job", company: "Company", message: "Conversation", user: "Account" };

export const MAX_DETAILS = 1000;

/** Returns an error message, or null when the report can be sent. */
export function validateReport(reason: string, details: string): string | null {
  if (!REPORT_REASONS.some((r) => r.value === reason)) return "Choose a reason.";
  if (reason === "other" && !details.trim()) return "Tell us what's wrong.";
  if (details.length > MAX_DETAILS) return `Keep details under ${MAX_DETAILS} characters.`;
  return null;
}

/** Only jobs and accounts can be restricted by moderators. */
export const canRestrict = (t: ReportTarget) => t === "job" || t === "user";

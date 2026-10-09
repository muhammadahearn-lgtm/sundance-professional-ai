// Hiring team review links: secret tokens emailed to stakeholders (no account).
// Only the SHA-256 hash is stored, so a database read never reveals a usable link.

export const REVIEW_TTL_DAYS = 14;
export const REVIEW_NOTE_MAX = 500;

export function newReviewToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashToken(token: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function isExpired(expiresAt: string, now: Date = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}

/** Pick must be one of the shared candidates; null means "none of these fit". */
export function validPick(pick: string | null, shared: string[]): boolean {
  return pick === null || shared.includes(pick);
}

// Single-candidate "Share with Hiring Manager" feedback.
export const PROFILE_FEEDBACK_MAX = 1000;
export const VERDICTS = [
  { value: "strong_yes", label: "Strong Yes" },
  { value: "yes", label: "Yes, advance" },
  { value: "hold", label: "Hold" },
  { value: "pass", label: "Pass" },
] as const;
export type Verdict = (typeof VERDICTS)[number]["value"];
export function isVerdict(v: string): v is Verdict { return VERDICTS.some((x) => x.value === v); }
export function verdictLabel(v: string): string { return VERDICTS.find((x) => x.value === v)?.label ?? v; }

/** Team Notes text for manager feedback received through a review link. */
export function feedbackNoteText(reviewer: string, role: string | null | undefined, verdict: Verdict, feedback: string): string {
  const who = role ? `${reviewer} (${role})` : reviewer;
  const head = `Hiring manager feedback from ${who} via review link — ${verdictLabel(verdict)}`;
  return (feedback.trim() ? `${head}\n${feedback.trim()}` : head).slice(0, 2000);
}

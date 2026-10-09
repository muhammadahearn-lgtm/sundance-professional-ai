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

/** Several picks allowed; every one must be shared, no duplicates. Empty = "none of these fit". */
export function validPicks(picks: string[], shared: string[]): boolean {
  return new Set(picks).size === picks.length && picks.every((p) => shared.includes(p));
}

/** Normalizes an optional profile URL. Returns "" for empty, null for invalid. */
export function normalizeUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return "";
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export type LinkKey = "linkedin_url" | "github_url" | "portfolio_url";
export const LINK_LABELS: Record<LinkKey, string> = { linkedin_url: "LinkedIn", github_url: "GitHub", portfolio_url: "Portfolio" };

/** Validates all three links; returns normalized values or the first error message. */
export function validateLinks(v: Record<LinkKey, string>): { ok: true; value: Record<LinkKey, string> } | { ok: false; error: string } {
  const out = {} as Record<LinkKey, string>;
  for (const k of Object.keys(LINK_LABELS) as LinkKey[]) {
    const n = normalizeUrl(v[k] ?? "");
    if (n === null) return { ok: false, error: `Enter a valid ${LINK_LABELS[k]} link.` };
    out[k] = n;
  }
  return { ok: true, value: out };
}

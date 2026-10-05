/** Normalizes a user-typed profile link. Returns "" for empty, null for invalid. */
export function normalizeLink(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "";
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    if (!u.hostname.includes(".")) return null;
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Short display form: drops protocol and "www.". */
export function displayLink(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
}

export type LinkFields = { linkedin_url: string; github_url: string; portfolio_url: string };

/** Validates all three links; returns normalized values or per-field errors. */
export function validateLinks(f: LinkFields): { values: LinkFields; errors: Partial<Record<keyof LinkFields, string>> } {
  const values = { ...f };
  const errors: Partial<Record<keyof LinkFields, string>> = {};
  (Object.keys(f) as (keyof LinkFields)[]).forEach((k) => {
    const n = normalizeLink(f[k]);
    if (n === null) errors[k] = "Enter a valid link, e.g. linkedin.com/in/yourname";
    else values[k] = n;
  });
  return { values, errors };
}

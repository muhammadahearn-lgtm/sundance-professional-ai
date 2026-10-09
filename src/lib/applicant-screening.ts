/** High-volume applicant screening helpers for the recruiter Applications inbox (pure, client-side). */

export const STRONG_FIT_MIN = 75;

export const QUICK_FILTERS = [
  ["strong", "Strong Fit (75%+)"],
  ["clean", "No Dealbreakers"],
  ["ready", "Ready Now"],
] as const;
export type QuickFilter = (typeof QUICK_FILTERS)[number][0];

export type ScreenFacts = { score?: number | undefined; dealbreakers?: number | undefined; availability: string };

export function passesQuickFilter(k: QuickFilter, f: ScreenFacts): boolean {
  if (k === "strong") return (f.score ?? -1) >= STRONG_FIT_MIN;
  if (k === "clean") return !f.dealbreakers;
  return f.availability === "active";
}

export const passesAll = (ks: Iterable<QuickFilter>, f: ScreenFacts) => [...ks].every((k) => passesQuickFilter(k, f));

/** Case-insensitive; every word must appear in name, title, or any skill/tech label. */
export function matchesKeyword(q: string, haystack: string[]): boolean {
  const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = haystack.join(" ").toLowerCase();
  return words.every((w) => text.includes(w));
}

export type Pill = { label: string; tone: "good" | "warn" };

/** Short decision pills from match sub-scores (0–100). */
export function qualificationPills(s?: { skill_alignment_score: number; technology_alignment_score: number; experience_alignment_score: number } | null): Pill[] {
  if (!s) return [];
  const one = (v: number, good: string, ok: string, weak: string): Pill => (v >= 80 ? { label: `✓ ${good}`, tone: "good" } : v >= 50 ? { label: ok, tone: "warn" } : { label: weak, tone: "warn" });
  return [
    one(s.skill_alignment_score, "Skills met", "Some skill gaps", "Skill gaps"),
    one(s.technology_alignment_score, "Tech stack fit", "Partial tech fit", "Tech gaps"),
    one(s.experience_alignment_score, "Experience fit", "Near experience bar", "Below experience bar"),
  ];
}

/** Next/previous index for speed review; null at the ends. */
export function stepIndex(i: number, len: number, dir: 1 | -1): number | null {
  const n = i + dir;
  return n < 0 || n >= len ? null : n;
}

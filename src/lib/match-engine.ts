/** Deterministic, explainable candidate–job matching. Same inputs always give the same score. */

export const MATCH_WEIGHTS = { languages: 20, skills: 30, technologies: 20, experience: 20, preferences: 10 } as const;
export const LEVEL_WEIGHT: Record<string, number> = { required: 3, preferred: 2, optional: 1 };
export const MATCH_FILTERS = [90, 80, 70, 60] as const;

export type Req = { id: string; level: string };
export type MatchCandidate = {
  langs: string[]; skills: string[]; techs: string[]; years: number;
  workArrangement: string; location: string; locationsOfInterest: string[]; targetRoles: string[]; roleId: string | null; availability: string; salaryAmount?: number | null | undefined; salaryCurrency?: string | undefined;
};
export type MatchJob = {
  langs: Req[]; skills: Req[]; techs: Req[]; minYears: number;
  workArrangement: string; location: string; roleId: string | null; title: string; maxSalary?: number | null | undefined; salaryCurrency?: string | undefined;
};
export type MatchDetails = {
  strengths: string[];
  missing: { languages: string[]; skills: string[]; technologies: string[]; requiredMissing: string[] };
  experienceGap: number;
  recommendations: string[];
  /** Set when missing required items capped the score. */
  cap?: { at: number; reason: string } | null;
};
export type MatchResult = {
  overall: number; languages: number; skills: number; technologies: number; experience: number; preferences: number;
  details: MatchDetails;
};

type Names = Record<string, string>;

/** Weighted share of job requirements the candidate has. No requirements → 100. */
export function categoryScore(have: string[], reqs: Req[]): { score: number; matched: Req[]; missing: Req[] } {
  if (!reqs.length) return { score: 100, matched: [], missing: [] };
  const set = new Set(have);
  const matched = reqs.filter((r) => set.has(r.id));
  const missing = reqs.filter((r) => !set.has(r.id));
  const total = reqs.reduce((s, r) => s + (LEVEL_WEIGHT[r.level] ?? 1), 0);
  const got = matched.reduce((s, r) => s + (LEVEL_WEIGHT[r.level] ?? 1), 0);
  return { score: Math.round((got / total) * 100), matched, missing };
}

/** Meets or exceeds the minimum → 100; otherwise proportional. */
export function experienceScore(years: number, minYears: number): number {
  if (minYears <= 0 || years >= minYears) return 100;
  return Math.max(0, Math.round((years / minYears) * 100));
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s-]+/g, "_");
const city = (s: string) => s.split(",")[0]?.trim().toLowerCase() ?? "";

/** First number in free text, "k" = thousands. "$120k-150k" -> 120000. */
export function salaryNumber(text: string | undefined): number | null {
  const m = (text ?? "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(k)?/i);
  if (!m) return null;
  const n = parseFloat(m[1]!) * (m[2] ? 1000 : 1);
  return n < 1000 ? n * 1000 : n;
}

/** Keep rows at or above a minimum match (0 = all). Unscored rows only pass "all". */
export function meetsMinMatch(score: number | null | undefined, min: number): boolean {
  return !min || (score != null && score >= min);
}

/** Five equal checks: work arrangement, location, target role, availability, salary. */
export function preferenceScore(c: MatchCandidate, j: MatchJob): { score: number; hits: string[]; misses: string[] } {
  const hits: string[] = [], misses: string[] = [];
  const ca = norm(c.workArrangement), ja = norm(j.workArrangement);
  if (!ca || ca === "any" || ca === "flexible" || ca === ja) hits.push("Work arrangement fits"); else misses.push("Work arrangement differs");
  const jc = city(j.location);
  const locs = [c.location, ...c.locationsOfInterest].map(city).filter(Boolean);
  if (ja === "remote" || !jc || locs.includes(jc)) hits.push("Location fits"); else misses.push("Location differs");
  const title = j.title.toLowerCase();
  if ((j.roleId && j.roleId === c.roleId) || c.targetRoles.some((r) => r.trim() && (title.includes(r.toLowerCase()) || r.toLowerCase().includes(title)))) hits.push("Role alignment"); else misses.push("Not a target role");
  if (norm(c.availability) !== "not_looking") hits.push("Open to opportunities"); else misses.push("Not currently looking");
  const want = c.salaryAmount ?? null;
  const sameCur = !c.salaryCurrency || !j.salaryCurrency || c.salaryCurrency === j.salaryCurrency;
  if (!want || !j.maxSalary || !sameCur || want <= j.maxSalary) hits.push("Salary alignment"); else misses.push("Salary expectation above range");
  return { score: hits.length * 20, hits, misses };
}

export function matchTier(score: number): { label: string; tone: "success" | "primary" | "warning" | "muted" } {
  if (score >= 90) return { label: "Excellent Match", tone: "success" };
  if (score >= 75) return { label: "Strong Match", tone: "primary" };
  if (score >= 60) return { label: "Moderate Match", tone: "warning" };
  return { label: "Weak Match", tone: "muted" };
}

/** Missing required items cap the overall score: 1 missing → 75, 2+ missing → 60. */
export function requiredCap(missingRequired: number): number {
  return missingRequired >= 2 ? 60 : missingRequired === 1 ? 75 : 100;
}

/**
 * Weighted overall where categories the job doesn't ask for are left out and their
 * weight is shared by the rest — blank categories never hand out free points.
 */
export function weightedOverall(parts: { score: number; weight: number; active: boolean }[]): number {
  const on = parts.filter((p) => p.active);
  const total = on.reduce((s, p) => s + p.weight, 0);
  if (!total) return 0;
  return Math.round(on.reduce((s, p) => s + p.score * p.weight, 0) / total);
}

export function computeMatch(c: MatchCandidate, j: MatchJob, names: Names = {}): MatchResult {
  const nm = (id: string) => names[id] ?? "Unknown";
  const L = categoryScore(c.langs, j.langs), S = categoryScore(c.skills, j.skills), T = categoryScore(c.techs, j.techs);
  const E = experienceScore(c.years, j.minYears), P = preferenceScore(c, j);
  const w = MATCH_WEIGHTS;
  const raw = weightedOverall([
    { score: L.score, weight: w.languages, active: j.langs.length > 0 },
    { score: S.score, weight: w.skills, active: j.skills.length > 0 },
    { score: T.score, weight: w.technologies, active: j.techs.length > 0 },
    { score: E, weight: w.experience, active: j.minYears > 0 },
    { score: P.score, weight: w.preferences, active: true },
  ]);
  const reqMissingCount = [...L.missing, ...S.missing, ...T.missing].filter((r) => r.level === "required").length;
  const cap = requiredCap(reqMissingCount);
  const overall = Math.min(raw, cap);

  const strengths: string[] = [];
  for (const r of [...L.matched, ...S.matched, ...T.matched].filter((r) => r.level === "required")) strengths.push(`${nm(r.id)} (required) matches`);
  for (const r of [...L.matched, ...S.matched, ...T.matched].filter((r) => r.level !== "required")) strengths.push(`${nm(r.id)} matches`);
  if (j.minYears > 0 && c.years >= j.minYears) strengths.push(c.years > j.minYears ? "Experience exceeds requirement" : "Experience meets requirement");
  strengths.push(...P.hits);

  const requiredMissing = [...L.missing, ...S.missing, ...T.missing].filter((r) => r.level === "required").map((r) => nm(r.id));
  const gap = Math.max(0, j.minYears - c.years);
  const recommendations = [
    ...requiredMissing.map((n) => `Add ${n} experience`),
    ...[...L.missing, ...S.missing, ...T.missing].filter((r) => r.level !== "required").slice(0, 3).map((r) => `Learn ${nm(r.id)}`),
    ...(gap ? [`Gain ${gap} more year${gap === 1 ? "" : "s"} of experience`] : []),
  ];

  return {
    overall, languages: L.score, skills: S.score, technologies: T.score, experience: E, preferences: P.score,
    details: {
      strengths,
      missing: { languages: L.missing.map((r) => nm(r.id)), skills: S.missing.map((r) => nm(r.id)), technologies: T.missing.map((r) => nm(r.id)), requiredMissing },
      experienceGap: gap,
      recommendations,
      cap: raw > cap ? { at: cap, reason: `Score capped at ${cap}% because ${requiredMissing.join(", ")} ${requiredMissing.length === 1 ? "is a" : "are"} required for this role.` } : null,
    },
  };
}

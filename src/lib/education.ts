import { taxonomyDisplay, taxonomyKey } from "./taxonomy";

/** Controlled degree list, lowest to highest. No custom entries. */
export const DEGREE_TYPES = ["High School Diploma", "Certificate Program", "Bootcamp", "Associate Degree", "Bachelor's Degree", "Master's Degree", "Professional Degree", "Doctorate (PhD)"] as const;
export type DegreeType = (typeof DEGREE_TYPES)[number];

/** Rank for "Bachelor's Degree+" filters. Certificate/Bootcamp sit with diploma-level. */
const RANK: Record<string, number> = { "High School Diploma": 1, "Certificate Program": 1, "Bootcamp": 1, "Associate Degree": 2, "Bachelor's Degree": 3, "Master's Degree": 4, "Professional Degree": 5, "Doctorate (PhD)": 5 };
export const degreeRank = (d: string | null | undefined) => (d ? RANK[d] ?? 0 : 0);
export const isDegreeType = (v: string): v is DegreeType => (DEGREE_TYPES as readonly string[]).includes(v);

/** Field of study / institution: trimmed, single-spaced Title Case (mirrors the DB trigger). */
export const normalizeEduText = (v: string) => taxonomyDisplay(v);
export const eduKey = (v: string) => taxonomyKey(v);

/** 4-digit numeric year only. Returns error text or null. */
export function gradYearError(v: string): string | null {
  if (!v) return null;
  if (!/^\d{4}$/.test(v)) return "Enter a 4-digit year, like 2024.";
  const y = Number(v);
  if (y < 1900 || y > 2100) return "Enter a year between 1900 and 2100.";
  return null;
}

export type EduLike = { degree_type?: string | null; degree?: string | null; field_of_study?: string | null; institution_name?: string | null; graduation_year?: number | null };
/** Display lines in the standard order: Degree Type, Field Of Study, Institution, Year. */
export function educationLines(e: EduLike): string[] {
  return [e.degree_type || e.degree || "", e.field_of_study ?? "", e.institution_name ?? "", e.graduation_year ? String(e.graduation_year) : ""].filter(Boolean);
}

export type EduFilter = { minDegree?: string | undefined; field?: string | undefined; gradAfter?: number | undefined };
/** True when any one education record satisfies all set filters. */
export function matchesEducation(records: EduLike[], f: EduFilter): boolean {
  if (!f.minDegree && !f.field && !f.gradAfter) return true;
  const min = degreeRank(f.minDegree);
  const fk = f.field ? eduKey(f.field) : "";
  return records.some((r) =>
    (!min || degreeRank(r.degree_type) >= min) &&
    (!fk || eduKey(r.field_of_study ?? "") === fk) &&
    (!f.gradAfter || (r.graduation_year ?? 0) > f.gradAfter));
}

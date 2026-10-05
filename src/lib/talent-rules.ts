import { EXPERIENCE_BUCKETS, experienceRange } from "./job-search";

export const CANDIDATE_COMPARE_MAX = 4;
export const TALENT_PAGE_SIZE = 10;
export const TALENT_SALARY_MAX = 400000;
export { EXPERIENCE_BUCKETS };
export const TALENT_SORTS: [string, string][] = [["match", "Best Match"], ["relevant", "Most Relevant"], ["exp_high", "Most Experience"], ["exp_low", "Least Experience"], ["updated", "Recently Updated"], ["alpha", "Alphabetical"]];
export const TALENT_INDUSTRIES = ["Technology", "Healthcare", "Financial Services", "Insurance", "Telecommunications", "Government", "Manufacturing", "Retail", "Consulting"];

export type TalentFilters = {
  q: string; role: string; langs: string[]; skills: string[]; soft?: string[]; techs: string[]; exp: string; avail: string[];
  loc: string; remote: boolean; smin: number; smax: number; arr: string[]; ind: string[]; sort: string; page: number; mm: number;
};
export const DEFAULT_TALENT: TalentFilters = { q: "", role: "", langs: [], skills: [], techs: [], exp: "", avail: [], loc: "", remote: false, smin: 0, smax: 0, arr: [], ind: [], sort: "match", page: 1, mm: 0 };

export type TalentRow = {
  id: string; name: string; jobTitle: string; employer: string; location: string; years: number; availability: string;
  headline: string; summary: string; salary: string; arrangement: string; industries: string[]; roleId: string | null;
  langs: string[]; skills: string[]; softSkills?: string[]; techs: string[]; updatedAt: string; completion: number; avatarPath?: string | null;
};

/** First number in free text, "k" = thousands. "$120k-150k" -> 120000. */
export function parseSalary(text: string): number | null {
  const m = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(k)?/i);
  if (!m) return null;
  const n = parseFloat(m[1]!) * (m[2] ? 1000 : 1);
  return n < 1000 ? n * 1000 : n;
}

export function talentFilterCount(f: TalentFilters): number {
  return [f.role, f.exp, f.loc].filter(Boolean).length + (f.remote ? 1 : 0) + f.langs.length + f.skills.length + (f.soft?.length ?? 0) + f.techs.length + f.avail.length + f.arr.length + f.ind.length + (f.smin || f.smax ? 1 : 0) + (f.mm ? 1 : 0);
}

const all = (need: string[], have: string[]) => need.every((x) => have.includes(x));

export function matchesTalent(c: TalentRow, f: TalentFilters, keywordIds: string[] = []): boolean {
  if (f.role && c.roleId !== f.role) return false;
  if (!all(f.langs, c.langs) || !all(f.skills, c.skills) || !all(f.techs, c.techs)) return false;
  // Soft skills are a display/search filter only — never part of match scoring.
  if (!all(f.soft ?? [], c.softSkills ?? [])) return false;
  const r = experienceRange(f.exp);
  if (r && (c.years < r.min || (r.max !== null && c.years > r.max))) return false;
  if (f.avail.length && !f.avail.includes(c.availability)) return false;
  if (f.arr.length && !f.arr.includes(c.arrangement)) return false;
  if (f.remote && c.arrangement !== "remote") return false;
  if (f.loc && !c.location.toLowerCase().includes(f.loc.toLowerCase())) return false;
  if (f.ind.length && !f.ind.some((i) => c.industries.includes(i))) return false;
  if (f.smin || f.smax) {
    const s = parseSalary(c.salary);
    if (s === null) return false;
    if (f.smin && s < f.smin) return false;
    if (f.smax && s > f.smax) return false;
  }
  const q = f.q.trim().toLowerCase();
  if (q) {
    const text = [c.name, c.jobTitle, c.employer, c.headline, c.summary, c.location].join(" ").toLowerCase();
    const idHit = keywordIds.some((id) => c.langs.includes(id) || c.skills.includes(id) || c.techs.includes(id) || c.roleId === id);
    if (!text.includes(q) && !idHit) return false;
  }
  return true;
}

export function sortTalent(rows: TalentRow[], sort: string, q = ""): TalentRow[] {
  const r = [...rows];
  const ql = q.toLowerCase();
  const score = (c: TalentRow) => (ql && c.jobTitle.toLowerCase().includes(ql) ? 50 : 0) + (ql && c.headline.toLowerCase().includes(ql) ? 20 : 0) + c.completion / 10 + (c.availability === "active" ? 5 : 0);
  if (sort === "exp_high") return r.sort((a, b) => b.years - a.years);
  if (sort === "exp_low") return r.sort((a, b) => a.years - b.years);
  if (sort === "updated") return r.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (sort === "alpha") return r.sort((a, b) => a.name.localeCompare(b.name));
  return r.sort((a, b) => score(b) - score(a));
}

// ---------- Applications & pipeline ----------
export const APP_STATUSES: [string, string][] = [["applied", "Applied"], ["viewed", "Viewed"], ["recruiter_contacted", "Recruiter Contacted"], ["interviewing", "Interviewing"], ["offer", "Offer"], ["hired", "Hired"], ["rejected", "Rejected"]];
export const STAGES: [string, string][] = [["saved", "Saved"], ["contacted", "Contacted"], ["interviewing", "Interviewing"], ["shortlisted", "Shortlisted"], ["offer", "Offer"], ["hired", "Hired"], ["rejected", "Rejected"]];
export type AppStatus = "applied" | "viewed" | "recruiter_contacted" | "interviewing" | "offer" | "hired" | "rejected";
export type Stage = "saved" | "contacted" | "interviewing" | "shortlisted" | "offer" | "hired" | "rejected";

export function canApply(jobStatus: string | null | undefined, alreadyApplied: boolean): { ok: boolean; reason: string } {
  if (alreadyApplied) return { ok: false, reason: "Already Applied" };
  if (!jobStatus) return { ok: false, reason: "Job Not Available" };
  if (jobStatus === "closed") return { ok: false, reason: "Job Closed" };
  if (jobStatus !== "active") return { ok: false, reason: "Job Not Available" };
  return { ok: true, reason: "" };
}

/** Application status a pipeline stage implies; null = leave unchanged. */
export function stageToStatus(stage: Stage): AppStatus | null {
  const m: Record<Stage, AppStatus | null> = { saved: null, contacted: "recruiter_contacted", interviewing: "interviewing", shortlisted: "interviewing", offer: "offer", hired: "hired", rejected: "rejected" };
  return m[stage];
}

/** Timeline steps for the candidate; rejected ends the flow at that point. */
export function timeline(status: AppStatus): { key: string; label: string; state: "done" | "current" | "pending" | "rejected" }[] {
  const flow = APP_STATUSES.filter(([k]) => k !== "rejected");
  if (status === "rejected") return [...flow.slice(0, 1).map(([key, label]) => ({ key, label, state: "done" as const })), { key: "rejected", label: "Rejected", state: "rejected" as const }];
  const idx = flow.findIndex(([k]) => k === status);
  return flow.map(([key, label], i) => ({ key, label, state: i < idx ? "done" : i === idx ? (key === "hired" ? "done" : "current") : "pending" }));
}

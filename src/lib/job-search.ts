export const COMPARE_MAX = 4;
export const PAGE_SIZE = 10;
export const SALARY_MAX = 400000;

export const EXPERIENCE_BUCKETS: [string, string, number, number | null][] = [
  ["0-2", "0-2 Years", 0, 2], ["3-5", "3-5 Years", 3, 5], ["5-8", "5-8 Years", 5, 8], ["8-10", "8-10 Years", 8, 10], ["10+", "10+ Years", 10, null],
];
export const SORTS: [string, string][] = [["match", "Highest Match"], ["relevant", "Most Relevant"], ["newest", "Newest First"], ["oldest", "Oldest First"], ["salary_high", "Highest Salary"], ["salary_low", "Lowest Salary"]];
export const POPULAR_SEARCHES = ["Python", "Remote Data Engineer", "AWS Snowflake", "Machine Learning Engineer", "Kubernetes", "TypeScript"];

export type SearchState = {
  q: string; role: string; langs: string[]; skills: string[]; techs: string[]; arr: string[]; emp: string[];
  exp: string; smin: number; smax: number; loc: string; company: string; sort: string; page: number;
};
export const DEFAULT_SEARCH: SearchState = { q: "", role: "", langs: [], skills: [], techs: [], arr: [], emp: [], exp: "", smin: 0, smax: 0, loc: "", company: "", sort: "match", page: 1 };

/** Strip characters that would break a PostgREST or() filter. */
export function sanitizeKeyword(q: string): string {
  return q.replace(/[,()%*\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function experienceRange(key: string): { min: number; max: number | null } | null {
  const b = EXPERIENCE_BUCKETS.find(([k]) => k === key);
  return b ? { min: b[2], max: b[3] } : null;
}

/** Intersect id sets; null means "no constraint yet". */
export function intersect(a: string[] | null, b: string[]): string[] {
  if (a === null) return [...new Set(b)];
  const s = new Set(b);
  return a.filter((x) => s.has(x));
}

export function activeFilterCount(s: SearchState): number {
  return [s.role, s.exp, s.loc, s.company].filter(Boolean).length + s.langs.length + s.skills.length + s.techs.length + s.arr.length + s.emp.length + (s.smin || s.smax ? 1 : 0);
}

export function canAddToCompare(current: number): boolean {
  return current < COMPARE_MAX;
}

/** Most-recent-first, de-duplicated (case-insensitive), capped at 6. */
export function pushRecent(list: string[], q: string): string[] {
  const t = q.trim();
  if (!t) return list;
  return [t, ...list.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 6);
}

/** Simple relevance: title hits beat description hits. */
export function relevance(title: string, description: string, q: string): number {
  const words = sanitizeKeyword(q).toLowerCase().split(" ").filter(Boolean);
  if (!words.length) return 0;
  const t = title.toLowerCase(), d = description.toLowerCase();
  return words.reduce((s, w) => s + (t.includes(w) ? 3 : 0) + (d.includes(w) ? 1 : 0), 0);
}

export function plainPreview(md: string, n = 180): string {
  const t = md.replace(/^#{1,3}\s.*$/gm, " ").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/^[-*]\s|^\d+\.\s/gm, "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n).trimEnd()}…` : t;
}

const RECENT_KEY = "sundance.recentJobSearches";
export function readRecent(): string[] {
  try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}
export function saveRecent(q: string): string[] {
  const next = pushRecent(readRecent(), q);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  return next;
}

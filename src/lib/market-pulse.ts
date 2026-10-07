/** Monthly Market Pulse: compares the last 30 days of new job posts with the 30 days before. Pure + explainable. */
export type PulseJob = { publishedAt: string | null; roleId: string | null; minSalary: number | null; maxSalary: number | null; reqIds: string[] };
export type Pulse = {
  newJobs: number; prevJobs: number; roleJobs: number; prevRoleJobs: number;
  rising: { id: string; name: string; now: number; prev: number; change: number; youHave: boolean }[];
  medianPay: number | null; prevMedianPay: number | null;
  coverage: number; // % of this month's top demanded items the candidate already has
};

const DAY = 86_400_000;
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2); };
const mid = (j: PulseJob) => j.minSalary != null && j.maxSalary != null ? (j.minSalary + j.maxSalary) / 2 : j.minSalary ?? j.maxSalary;

export function marketPulse(jobs: PulseJob[], my: { roleId: string | null; ids: string[] }, names: Record<string, string>, now = Date.now()): Pulse {
  const age = (j: PulseJob) => j.publishedAt ? (now - new Date(j.publishedAt).getTime()) / DAY : Infinity;
  const cur = jobs.filter((j) => age(j) >= 0 && age(j) < 30), prev = jobs.filter((j) => age(j) >= 30 && age(j) < 60);
  const count = (xs: PulseJob[]) => { const m: Record<string, number> = {}; for (const j of xs) for (const id of new Set(j.reqIds)) m[id] = (m[id] ?? 0) + 1; return m; };
  const c = count(cur), p = count(prev), mine = new Set(my.ids);
  const rising = Object.keys(c).filter((id) => names[id]).map((id) => {
    const n = c[id]!, o = p[id] ?? 0;
    return { id, name: names[id]!, now: n, prev: o, change: o ? Math.round(((n - o) / o) * 100) : 100, youHave: mine.has(id) };
  }).sort((a, b) => b.now - a.now || b.change - a.change).slice(0, 6);
  const pay = (xs: PulseJob[]) => median(xs.filter((j) => !my.roleId || j.roleId === my.roleId).map(mid).filter((x): x is number => x != null));
  const role = (xs: PulseJob[]) => my.roleId ? xs.filter((j) => j.roleId === my.roleId).length : 0;
  return {
    newJobs: cur.length, prevJobs: prev.length, roleJobs: role(cur), prevRoleJobs: role(prev), rising,
    medianPay: pay(cur), prevMedianPay: pay(prev),
    coverage: rising.length ? Math.round((rising.filter((r) => r.youHave).length / rising.length) * 100) : 0,
  };
}

export const CAREER_MODES = [
  { value: "active", label: "Actively Looking", desc: "Recruiters see you're open to new roles now." },
  { value: "passive", label: "Open to Exceptional Roles", desc: "Employed, but open to the right offer. Recruiters see your pay floor." },
  { value: "not_looking", label: "Employed & Not Looking", desc: "Keep your profile and Market Pulse — just not available right now." },
] as const;
export type CareerMode = (typeof CAREER_MODES)[number]["value"];

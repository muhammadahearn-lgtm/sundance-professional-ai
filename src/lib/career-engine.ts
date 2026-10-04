/** Deterministic, explainable career intelligence. Same inputs always give the same output. */
import { LEVEL_WEIGHT, MATCH_WEIGHTS, type Req } from "./match-engine";

export const READINESS_WEIGHTS = { completion: 20, skills: 25, technologies: 20, experience: 25, certifications: 10 } as const;

export type CareerCandidate = {
  title: string; years: number; location: string; targetRoles: string[]; roleId: string | null;
  langs: string[]; skills: string[]; techs: string[]; certifications: string[]; completion: number;
};
export type MarketJob = {
  id: string; title: string; roleId: string | null; minSalary: number | null; maxSalary: number | null; minYears: number;
  langs: Req[]; skills: Req[]; techs: Req[];
};
export type ScoreLite = { jobId: string; overall: number; skills: number; technologies: number; experience: number };
export type Kind = "language" | "skill" | "technology";
export type Gap = { id: string; name: string; kind: Kind; demand: number; impact: number; level: "High" | "Medium" | "Low" };
export type Recommendation = { title: string; why: string; impact: string; priority: "High" | "Medium" | "Low"; outcome: string };
export type RoadmapStep = { role: string; skills: string[]; technologies: string[]; readiness: number; current?: boolean };
export type Salary = { comparableJobs: number; marketLow: number; marketHigh: number; conservative: number; expected: [number, number]; stretch: number };

export function readinessTier(score: number): string {
  if (score >= 90) return "Industry Ready";
  if (score >= 80) return "Highly Competitive";
  if (score >= 70) return "Competitive";
  if (score >= 60) return "Developing";
  return "Needs Improvement";
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Weighted readiness: completion 20, skills 25, technologies 20, experience 25, certifications 10. */
export function readiness(c: CareerCandidate, top: ScoreLite[]) {
  const parts = {
    completion: clamp(c.completion, 0, 100),
    skills: top.length ? avg(top.map((s) => s.skills)) : Math.min(100, (c.skills.length + c.langs.length) * 15),
    technologies: top.length ? avg(top.map((s) => s.technologies)) : Math.min(100, c.techs.length * 20),
    experience: top.length ? avg(top.map((s) => s.experience)) : Math.min(100, c.years * 12.5),
    certifications: Math.min(100, c.certifications.length * 50),
  };
  const w = READINESS_WEIGHTS;
  const score = Math.round((parts.completion * w.completion + parts.skills * w.skills + parts.technologies * w.technologies + parts.experience * w.experience + parts.certifications * w.certifications) / 100);
  return { score, tier: readinessTier(score), parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Math.round(v)])) as Record<keyof typeof w, number> };
}

const CAT: Record<Kind, { key: "langs" | "skills" | "techs"; weight: number }> = {
  language: { key: "langs", weight: MATCH_WEIGHTS.languages }, skill: { key: "skills", weight: MATCH_WEIGHTS.skills }, technology: { key: "techs", weight: MATCH_WEIGHTS.technologies },
};

/** Average match points gained across jobs if the candidate added this item. */
export function impactOf(id: string, kind: Kind, jobs: MarketJob[]): number {
  if (!jobs.length) return 0;
  const { key, weight } = CAT[kind];
  const gains = jobs.map((j) => {
    const reqs = j[key];
    const r = reqs.find((x) => x.id === id);
    if (!r) return 0;
    const total = reqs.reduce((s, x) => s + (LEVEL_WEIGHT[x.level] ?? 1), 0);
    return (weight * (LEVEL_WEIGHT[r.level] ?? 1)) / total;
  });
  return Math.round(avg(gains) * 10) / 10;
}
const impactLevel = (n: number): Gap["level"] => (n >= 5 ? "High" : n >= 2 ? "Medium" : "Low");

/** Demand = weighted count of active jobs asking for each item. */
export function demand(jobs: MarketJob[], kind: Kind): Record<string, number> {
  const out: Record<string, number> = {};
  for (const j of jobs) for (const r of j[CAT[kind].key]) out[r.id] = (out[r.id] ?? 0) + (LEVEL_WEIGHT[r.level] ?? 1);
  return out;
}

/** Missing items ranked by impact then demand, measured against the jobs most relevant to the candidate. */
export function gaps(c: CareerCandidate, relevant: MarketJob[], kind: Kind, names: Record<string, string>): Gap[] {
  const have = new Set(c[CAT[kind].key]);
  const d = demand(relevant, kind);
  return Object.entries(d).filter(([id]) => !have.has(id)).map(([id, n]) => {
    const impact = impactOf(id, kind, relevant);
    return { id, name: names[id] ?? "Unknown", kind, demand: n, impact, level: impactLevel(impact) };
  }).sort((a, b) => b.impact - a.impact || b.demand - a.demand || a.name.localeCompare(b.name));
}

const words = (s: string) => s.toLowerCase().replace(/senior|junior|lead|staff|principal|sr\.?|jr\.?/g, "").split(/[^a-z]+/).filter((w) => w.length > 2);

/** Jobs that fit the candidate's role, title or target roles; falls back to all jobs. */
export function relevantJobs(c: CareerCandidate, jobs: MarketJob[]): MarketJob[] {
  const want = new Set([c.title, ...c.targetRoles].flatMap(words));
  const hit = jobs.filter((j) => (c.roleId && j.roleId === c.roleId) || words(j.title).some((w) => want.has(w)));
  return hit.length ? hit : jobs;
}

/** Salary bands from comparable jobs, nudged ±2% per year above/below their average minimum experience (max ±15%). */
export function salaryIntel(c: CareerCandidate, comparable: MarketJob[]): Salary | null {
  const withPay = comparable.filter((j) => j.minSalary || j.maxSalary);
  if (!withPay.length) return null;
  const lo = avg(withPay.map((j) => j.minSalary ?? j.maxSalary!)), hi = avg(withPay.map((j) => j.maxSalary ?? j.minSalary!));
  const f = 1 + clamp((c.years - avg(withPay.map((j) => j.minYears))) * 0.02, -0.15, 0.15);
  const r = (n: number) => Math.round(n / 1000) * 1000;
  return { comparableJobs: withPay.length, marketLow: r(lo), marketHigh: r(hi), conservative: r(lo * Math.min(f, 1)), expected: [r(lo * f), r(hi * f)], stretch: r(hi * Math.max(f, 1) * 1.1) };
}

const LADDER = ["Junior", "", "Senior", "Lead", "Principal"];
export function careerLevel(title: string, years: number): number {
  const t = title.toLowerCase();
  if (/principal|architect|distinguished/.test(t)) return 4;
  if (/lead|staff/.test(t)) return 3;
  if (/senior|sr\b/.test(t)) return 2;
  if (/junior|jr\b|intern|associate/.test(t)) return 0;
  return years < 2 ? 0 : years < 5 ? 1 : years < 8 ? 2 : years < 12 ? 3 : 4;
}
const baseTitle = (t: string) => t.replace(/\b(junior|jr\.?|senior|sr\.?|lead|staff|principal|associate)\b/gi, "").replace(/\s+/g, " ").trim() || "Engineer";

/** Current role plus the next three steps up the ladder, each needing the next-highest-impact gaps. */
export function roadmap(c: CareerCandidate, score: number, skillGaps: Gap[], techGaps: Gap[]): RoadmapStep[] {
  const base = baseTitle(c.targetRoles[0] || c.title || "Engineer");
  const lvl = careerLevel(c.title, c.years);
  const name = (l: number) => [LADDER[l], base].filter(Boolean).join(" ");
  const steps: RoadmapStep[] = [{ role: c.title || name(lvl), skills: [], technologies: [], readiness: score, current: true }];
  for (let k = 1; k <= 3 && lvl + k < LADDER.length; k++) {
    steps.push({ role: name(lvl + k), skills: skillGaps.slice((k - 1) * 2, k * 2).map((g) => g.name), technologies: techGaps.slice((k - 1) * 2, k * 2).map((g) => g.name), readiness: Math.max(0, score - 15 * k) });
  }
  return steps;
}

export const CERT_FOR: Record<string, string> = {
  aws: "AWS Certified Solutions Architect – Associate", azure: "Microsoft Azure Fundamentals (AZ-900)", "google cloud": "Google Cloud Associate Cloud Engineer", gcp: "Google Cloud Associate Cloud Engineer",
  terraform: "HashiCorp Terraform Associate", kubernetes: "Certified Kubernetes Administrator (CKA)", snowflake: "SnowPro Core Certification", databricks: "Databricks Certified Data Engineer Associate",
  docker: "Docker Certified Associate", kafka: "Confluent Certified Developer for Apache Kafka", tableau: "Tableau Desktop Specialist", "power bi": "Microsoft Power BI Data Analyst (PL-300)",
};
export function certFor(name: string): string | null {
  const n = name.toLowerCase();
  const k = Object.keys(CERT_FOR).find((x) => n.includes(x));
  return k ? CERT_FOR[k]! : null;
}

export function recommendations(skillGaps: Gap[], techGaps: Gap[], langGaps: Gap[], c: CareerCandidate, techNames: string[], nJobs: number): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const g of [...skillGaps, ...techGaps, ...langGaps].sort((a, b) => b.impact - a.impact).slice(0, 6)) {
    recs.push({
      title: `${g.kind === "technology" ? "Gain" : "Add"} ${g.name} experience`,
      why: `Requested by jobs that fit your target roles (demand score ${g.demand}).`,
      impact: `Could improve your average match score by about ${g.impact}%.`,
      priority: g.level, outcome: `Higher match on ${g.name}-heavy roles.`,
    });
  }
  const held = new Set(c.certifications.map((x) => x.toLowerCase()));
  const certTarget = [...techNames, ...techGaps.slice(0, 3).map((g) => g.name)].map(certFor).find((x) => x && ![...held].some((h) => h.includes(x.toLowerCase().slice(0, 12))));
  if (certTarget) recs.push({ title: `Earn ${certTarget}`, why: c.certifications.length ? "Adds proof for a high-demand technology." : "You have no certifications listed yet.", impact: `Raises the certifications part of your readiness (10% weight).`, priority: c.certifications.length ? "Medium" : "High", outcome: "Stronger credibility with recruiters." });
  if (c.completion < 100) recs.push({ title: "Complete your profile", why: `Your profile is ${c.completion}% complete.`, impact: "Profile completeness is 20% of your readiness score.", priority: c.completion < 70 ? "High" : "Low", outcome: "Better visibility in recruiter searches." });
  if (!nJobs) recs.push({ title: "Check back as jobs are published", why: "There are no active jobs to compare against yet.", impact: "Gap analysis becomes more precise with more jobs.", priority: "Low", outcome: "More accurate guidance." });
  const order = { High: 0, Medium: 1, Low: 2 };
  return recs.sort((a, b) => order[a.priority] - order[b.priority]);
}

export type CareerReport = ReturnType<typeof careerReport>;

/** Full report used by the dashboard widget and the Career Intelligence page. */
export function careerReport(c: CareerCandidate, jobs: MarketJob[], scores: ScoreLite[], names: Record<string, string>) {
  const ranked = [...scores].sort((a, b) => b.overall - a.overall);
  const top = ranked.slice(0, 5);
  const rel = relevantJobs(c, jobs);
  const r = readiness(c, top);
  const skillGaps = gaps(c, rel, "skill", names), techGaps = gaps(c, rel, "technology", names), langGaps = gaps(c, rel, "language", names);
  const skillDemand = demand(jobs, "skill"), techDemand = demand(jobs, "technology"), langDemand = demand(jobs, "language");
  const topBy = (d: Record<string, number>, n = 5) => Object.entries(d).sort((a, b) => b[1] - a[1] || (names[a[0]] ?? "").localeCompare(names[b[0]] ?? "")).slice(0, n).map(([id, v]) => ({ id, name: names[id] ?? "Unknown", demand: v }));
  const roleCount: Record<string, number> = {};
  for (const j of jobs) { const k = baseTitle(j.title); roleCount[k] = (roleCount[k] ?? 0) + 1; }
  const growingRoles = Object.entries(roleCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, n]) => ({ name, jobs: n }));

  const strengths: string[] = [], weaknesses: string[] = [], growth: string[] = [], risks: string[] = [];
  for (const [kind, ids, d] of [["skill", c.skills, skillDemand], ["technology", c.techs, techDemand], ["language", c.langs, langDemand]] as const) {
    for (const id of [...ids].sort((a, b) => (d[b] ?? 0) - (d[a] ?? 0)).slice(0, 2)) if (d[id]) strengths.push(`Strong ${names[id] ?? kind} — in demand across active jobs`);
  }
  if (c.years >= 5) strengths.push(`${c.years} years of experience`);
  for (const g of [...skillGaps, ...techGaps].slice(0, 4)) weaknesses.push(`Need ${g.name} exposure`);
  for (const g of [...skillGaps, ...techGaps, ...langGaps].filter((g) => g.level === "High").slice(0, 3)) growth.push(`Adding ${g.name} could lift your average match ~${g.impact}%`);
  if (!c.certifications.length) risks.push("No certifications listed");
  if (c.completion < 70) risks.push("Profile is less than 70% complete");
  if (scores.length && !scores.some((s) => s.overall >= 60)) risks.push("No jobs above 60% match yet");
  if (!c.skills.length && !c.langs.length) risks.push("No skills listed — matching can't credit you");

  return {
    readiness: r, skillGaps, techGaps, langGaps,
    current: { skills: c.skills.map((id) => names[id] ?? "Unknown"), technologies: c.techs.map((id) => names[id] ?? "Unknown"), languages: c.langs.map((id) => names[id] ?? "Unknown") },
    market: { skills: topBy(skillDemand), technologies: topBy(techDemand), languages: topBy(langDemand), roles: growingRoles, jobs: jobs.length },
    salary: salaryIntel(c, rel),
    recommendations: recommendations(skillGaps, techGaps, langGaps, c, c.techs.map((id) => names[id] ?? ""), jobs.length),
    roadmap: roadmap(c, r.score, skillGaps, techGaps),
    insights: { strengths, weaknesses, growth, risks },
    averageMatch: scores.length ? Math.round(avg(scores.map((s) => s.overall))) : null,
    topMatches: top,
  };
}

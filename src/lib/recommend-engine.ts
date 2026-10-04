/** Deterministic, explainable recommendations. Same inputs always give the same ranked output. */
import { certFor, type Gap, type RoadmapStep, type Salary } from "./career-engine";
import type { MatchDetails } from "./match-engine";

export type RecTier = { label: "Highly Recommended" | "Strong Recommendation" | "Moderate Recommendation" | "Low Priority"; tone: "success" | "primary" | "warning" | "muted" };
export function recTier(score: number): RecTier {
  if (score >= 90) return { label: "Highly Recommended", tone: "success" };
  if (score >= 75) return { label: "Strong Recommendation", tone: "primary" };
  if (score >= 60) return { label: "Moderate Recommendation", tone: "warning" };
  return { label: "Low Priority", tone: "muted" };
}
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const byScore = <T extends { score: number; title: string }>(a: T, b: T) => b.score - a.score || a.title.localeCompare(b.title);

/** Every recommendation carries a score, the why, the expected value and the action. */
export type Rec = { id: string; title: string; subtitle?: string | undefined; score: number; why: string[]; value: string; action: string };

// ---------------- Candidate ----------------

export type JobInput = { jobId: string; title: string; company: string; location: string; salary: string; overall: number; details: MatchDetails | null; saved: boolean; applied: boolean };
export type JobRec = Rec & { jobId: string; company: string; location: string; salary: string; match: number; saved: boolean };

/** Score = 85% of match + up to 15 for few missing required items + 3 if already saved. Applied jobs are skipped. */
export function recommendJobs(jobs: JobInput[], readiness: number): JobRec[] {
  return jobs.filter((j) => !j.applied).map((j) => {
    const req = j.details?.missing.requiredMissing.length ?? 0;
    const score = clamp(j.overall * 0.85 + (req === 0 ? 15 : req === 1 ? 8 : 0) + (j.saved ? 3 : 0));
    const why = [`${Math.round(j.overall)}% match score`];
    if (req === 0) why.push("Meets every required item");
    else if (req === 1) why.push(`Missing only one requirement (${j.details!.missing.requiredMissing[0]})`);
    else why.push(`Missing ${req} required items`);
    for (const s of (j.details?.strengths ?? []).slice(0, 2)) why.push(s);
    if (readiness >= 75) why.push("High career readiness");
    return { id: j.jobId, jobId: j.jobId, title: j.title, subtitle: j.company, company: j.company, location: j.location, salary: j.salary, match: Math.round(j.overall), saved: j.saved, score, why,
      value: score >= 75 ? "Strong chance of recruiter interest" : req ? "Closing the missing items would raise this match" : "Good stretch opportunity", action: "Apply" };
  }).sort(byScore);
}

/** Score = 50 + 1.5 × expected match lift + 15 (High) / 8 (Medium). */
export function recommendGaps(gaps: Gap[]): Rec[] {
  return gaps.map((g) => ({
    id: g.id, title: g.name, subtitle: g.level === "High" ? "High priority" : g.level === "Medium" ? "Medium priority" : "Low priority",
    score: clamp(50 + g.impact * 1.5 + (g.level === "High" ? 15 : g.level === "Medium" ? 8 : 0)),
    why: [`Requested by jobs that fit your target roles (demand ${g.demand})`, `Adding it could lift your average match about ${g.impact}%`],
    value: `+${g.impact}% expected match improvement`, action: `Add ${g.name} to your profile`,
  })).sort(byScore);
}

const PROVIDERS: [RegExp, string][] = [[/^AWS/, "Amazon Web Services"], [/Azure|Power BI/, "Microsoft"], [/Google/, "Google Cloud"], [/HashiCorp/, "HashiCorp"], [/Kubernetes/, "Cloud Native Computing Foundation"], [/SnowPro/, "Snowflake"], [/Databricks/, "Databricks"], [/Docker/, "Docker"], [/Confluent/, "Confluent"], [/Tableau/, "Tableau"]];
export function providerOf(cert: string): string { return PROVIDERS.find(([r]) => r.test(cert))?.[1] ?? "Industry body"; }

/** Certs for technologies in demand (gaps, 70 + lift) or already held (60); +15 when the candidate has none. */
export function recommendCerts(held: string[], heldTechNames: string[], techGaps: Gap[]): Rec[] {
  const have = held.map((h) => h.toLowerCase());
  const out = new Map<string, Rec>();
  const add = (techName: string, base: number, lift: number, why: string) => {
    const c = certFor(techName);
    if (!c || out.has(c) || have.some((h) => h.includes(c.toLowerCase().slice(0, 12)))) return;
    out.set(c, { id: c, title: c, subtitle: providerOf(c), score: clamp(base + lift + (held.length ? 0 : 15)), why: [why, ...(held.length ? [] : ["You have no certifications listed yet"])],
      value: `Raises the certifications part of readiness (10% weight)${lift ? ` and supports ~${lift}% match lift` : ""}`, action: "Plan this certification" });
  };
  for (const g of techGaps) add(g.name, 70, Math.round(g.impact / 2), `${g.name} is a gap in jobs that fit you`);
  for (const t of heldTechNames) add(t, 60, 0, `Proves your existing ${t} experience`);
  return [...out.values()].sort(byScore);
}

export type GrowthRec = Rec & { readiness: number; skills: string[]; technologies: string[]; salaryIncrease: string };
/** Next roles from the roadmap; each step up assumes about +12% pay on the expected salary midpoint. */
export function recommendGrowth(steps: RoadmapStep[], salary: Salary | null): GrowthRec[] {
  const mid = salary ? (salary.expected[0] + salary.expected[1]) / 2 : null;
  return steps.filter((s) => !s.current).map((s, i) => {
    const pct = 12 * (i + 1);
    const inc = mid ? `+$${Math.round((mid * pct) / 100 / 1000)}k (~${pct}%)` : `~${pct}%`;
    return { id: s.role, title: s.role, score: clamp(s.readiness + (i === 0 ? 20 : 0)), readiness: s.readiness, skills: s.skills, technologies: s.technologies, salaryIncrease: inc,
      why: [i === 0 ? "Your next step up the ladder" : `Step ${i + 1} on your roadmap`, `${s.readiness}% estimated readiness`],
      value: `Expected salary increase ${inc}`, action: s.skills.length || s.technologies.length ? `Learn ${[...s.skills, ...s.technologies].slice(0, 2).join(" and ")}` : "Keep building experience" };
  });
}

// ---------------- Recruiter ----------------

export type CandInput = { candidateId: string; name: string; role: string; skills: string[]; availability: string; jobId: string; jobTitle: string; overall: number; details: MatchDetails | null; applied: boolean; inPipeline: boolean; saved: boolean };
export type CandRec = Rec & { candidateId: string; jobId: string; jobTitle: string; match: number; skills: string[]; availability: string; saved: boolean };

const AVAIL_NOW = /immediate|actively|now|2 weeks|two weeks/i;
/** Best job per candidate. Score = 85% of match + 8 applicant + 5 available soon + up to 7 for no missing required. Skips candidates already in the pipeline for that job. */
export function recommendCandidates(rows: CandInput[]): CandRec[] {
  const best = new Map<string, CandInput>();
  for (const r of rows) if (!r.inPipeline && (!best.has(r.candidateId) || r.overall > best.get(r.candidateId)!.overall)) best.set(r.candidateId, r);
  return [...best.values()].map((r) => {
    const req = r.details?.missing.requiredMissing.length ?? 0;
    const score = clamp(r.overall * 0.85 + (r.applied ? 8 : 0) + (AVAIL_NOW.test(r.availability) ? 5 : 0) + (req === 0 ? 7 : req === 1 ? 3 : 0));
    const why = [`${Math.round(r.overall)}% match for ${r.jobTitle}`];
    if (r.applied) why.push("Applied to this job");
    if (req === 0) why.push("Meets every required item"); else if (req === 1) why.push("Missing only one requirement");
    for (const s of (r.details?.strengths ?? []).slice(0, 2)) why.push(s);
    if (AVAIL_NOW.test(r.availability)) why.push("Available soon");
    return { id: r.candidateId, candidateId: r.candidateId, jobId: r.jobId, jobTitle: r.jobTitle, title: r.name, subtitle: r.role, match: Math.round(r.overall), skills: r.skills, availability: r.availability, saved: r.saved,
      score, why, value: score >= 75 ? "Likely interview-ready" : "Worth a closer look", action: "Add To Pipeline" };
  }).sort(byScore);
}

export type PipeInput = { pipelineId: string; candidateId: string; name: string; jobTitle: string; stage: string; stageDate: string; match: number | null };
export type PipeRec = Rec & { pipelineId: string; candidateId: string; nextStage: string | null };
const DAY = 86400000;
/** Stalled (21+ days) → close; otherwise the natural next step for the stage. */
export function recommendPipeline(cards: PipeInput[], now = new Date()): PipeRec[] {
  const out: PipeRec[] = [];
  for (const c of cards) {
    if (c.stage === "hired" || c.stage === "rejected") continue;
    const days = Math.floor((now.getTime() - new Date(c.stageDate).getTime()) / DAY);
    const m = c.match ?? 0;
    const base = { id: c.pipelineId, pipelineId: c.pipelineId, candidateId: c.candidateId, subtitle: `${c.name} · ${c.jobTitle}` };
    const why0 = `In "${c.stage}" for ${days} day${days === 1 ? "" : "s"}`;
    const mWhy = c.match != null ? [`${Math.round(m)}% match score`] : [];
    if (days >= 21) out.push({ ...base, title: "Close Stalled Candidate", nextStage: "rejected", score: clamp(55 + Math.min(days - 21, 30)), why: [why0, "No movement in 3+ weeks", ...mWhy], value: "Keeps your pipeline accurate", action: "Close" });
    else if (c.stage === "saved") out.push({ ...base, title: "Follow Up Candidate", nextStage: "contacted", score: clamp(50 + m * 0.4 + Math.min(days, 10)), why: [why0, ...mWhy], value: "Starts the conversation before others do", action: "Mark Contacted" });
    else if (c.stage === "contacted") out.push({ ...base, title: "Schedule Interview", nextStage: "interviewing", score: clamp(55 + m * 0.4 + Math.min(days, 10)), why: [why0, ...mWhy], value: "Moves an engaged candidate forward", action: "Move To Interviewing" });
    else if (c.stage === "interviewing" && m >= 75) out.push({ ...base, title: "Move Candidate To Shortlist", nextStage: "shortlisted", score: clamp(50 + m * 0.45), why: [why0, ...mWhy, "Strong match after interviewing"], value: "Focuses the team on top finalists", action: "Shortlist" });
    else if (c.stage === "shortlisted") out.push({ ...base, title: "Extend Offer", nextStage: "offer", score: clamp(55 + m * 0.4), why: [why0, ...mWhy], value: "Reduces risk of losing a finalist", action: "Move To Offer" });
  }
  return out.sort(byScore);
}

export type JobHealthInput = { jobId: string; title: string; arrangement: string; location: string; minYears: number; maxSalary: number | null; descriptionLength: number; scores: { overall: number; experienceGap: number }[]; marketMaxSalary: number | null };
export type HiringRec = Rec & { jobId: string };
/** Suggestions for jobs that attract fewer than 3 matches at 60%+. Score rises as the talent pool shrinks. */
export function recommendHiring(jobs: JobHealthInput[]): HiringRec[] {
  const out: HiringRec[] = [];
  for (const j of jobs) {
    const strong = j.scores.filter((s) => s.overall >= 60).length;
    const pool = `${strong} candidate${strong === 1 ? "" : "s"} at 60%+ match`;
    const urgency = strong >= 3 ? 0 : (3 - strong) * 10;
    const add = (key: string, title: string, base: number, why: string, value: string, action: string) => out.push({ id: `${j.jobId}:${key}`, jobId: j.jobId, title, subtitle: j.title, score: clamp(base + urgency), why: [why, pool], value, action });
    if (j.descriptionLength < 400) add("desc", "Improve Job Description", 50, `Description is only ${j.descriptionLength} characters`, "Clearer postings attract more applicants", "Edit Job");
    if (strong >= 3) continue;
    if (j.arrangement === "on_site") add("remote", "Add Remote Option", 60, "Role is on-site only", "Opens the role to candidates in any location", "Edit Job");
    if (j.arrangement !== "remote" && j.location) add("loc", "Expand Location Search", 55, `Search is limited to ${j.location}`, "Widens the reachable talent pool", "Search Talent");
    const gapped = j.scores.filter((s) => s.experienceGap > 0).length;
    if (j.minYears >= 3 && gapped >= Math.max(1, j.scores.length / 2)) add("exp", "Reduce Experience Requirement", 58, `${gapped} of ${j.scores.length} candidates fall short of ${j.minYears} years`, "More qualified candidates become eligible", "Edit Job");
    if (j.maxSalary && j.marketMaxSalary && j.maxSalary < j.marketMaxSalary * 0.9) add("pay", "Increase Salary Range", 57, `Top of range $${Math.round(j.maxSalary / 1000)}k is below similar jobs ($${Math.round(j.marketMaxSalary / 1000)}k)`, "Competitive pay improves response rates", "Edit Job");
  }
  return out.sort(byScore);
}

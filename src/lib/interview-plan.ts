import { INTERVIEW_TYPES, CUSTOM_TYPE } from "./interview-rules";

/** One planned interview round for a job. Position in the array = round number. Optional kit: focus + rubric criteria. */
export type PlanRound = { type: string; name: string; duration_minutes: number; focus?: string; rubric?: string[] };

export const PLAN_MIN = 1;
export const PLAN_MAX = 5;
export const PLAN_DURATIONS = [30, 45, 60, 90];
export const RUBRIC_MAX = 5;
export const RUBRIC_ITEM_MAX = 120;
export const FOCUS_MAX = 100;

/** Suggested interview kit per round type. */
export const DEFAULT_KITS: Record<string, { focus: string; rubric: string[] }> = {
  screen: { focus: "Motivation and basic fit", rubric: ["Background & career trajectory", "Motivation for this role", "Compensation & timeline alignment"] },
  technical: { focus: "Hands-on technical depth", rubric: ["Problem-solving approach", "Code quality & testing", "Handling edge cases"] },
  system_design: { focus: "Architecture and trade-offs", rubric: ["Scalability & bottlenecks", "Clear component boundaries", "Data storage trade-offs"] },
  behavioral: { focus: "Teamwork and ownership", rubric: ["Conflict resolution & taking feedback", "Ownership & proactive execution", "Cross-team collaboration"] },
  final: { focus: "Long-term fit and impact", rubric: ["Strategic impact", "Mutual long-term fit", "Clear communication with leaders"] },
};
export const defaultKit = (type: string) => DEFAULT_KITS[type] ?? { focus: "", rubric: [] };

export const DEFAULT_PLAN: PlanRound[] = [
  { type: "screen", name: "Initial Screen", duration_minutes: 30, ...structuredClone(DEFAULT_KITS.screen!) },
  { type: "technical", name: "Technical Deep Dive", duration_minutes: 60, ...structuredClone(DEFAULT_KITS.technical!) },
  { type: "final", name: "Final Round", duration_minutes: 45, ...structuredClone(DEFAULT_KITS.final!) },
];

const typeName = (t: string) => INTERVIEW_TYPES.find(([k]) => k === t)?.[1] ?? "";

/** Clean a rubric list: trimmed, non-empty, deduped, capped. */
export function normalizeRubric(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const s = typeof x === "string" ? x.trim().slice(0, RUBRIC_ITEM_MAX) : "";
    if (s && !out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s);
    if (out.length >= RUBRIC_MAX) break;
  }
  return out;
}

/** Clean any stored value into a valid plan (falls back to the default). */
export function normalizePlan(v: unknown): PlanRound[] {
  if (!Array.isArray(v)) return DEFAULT_PLAN.map((r) => structuredClone(r));
  const out = v.slice(0, PLAN_MAX).map((r): PlanRound => {
    const o = (r ?? {}) as Partial<PlanRound>;
    const type = typeof o.type === "string" && (o.type === CUSTOM_TYPE || INTERVIEW_TYPES.some(([k]) => k === o.type)) ? o.type : CUSTOM_TYPE;
    const name = (typeof o.name === "string" ? o.name.trim() : "").slice(0, 60) || typeName(type) || "Interview";
    const d = Number(o.duration_minutes);
    return { type, name, duration_minutes: Number.isFinite(d) && d >= 10 && d <= 480 ? Math.round(d) : 45, focus: typeof o.focus === "string" ? o.focus.trim().slice(0, FOCUS_MAX) : "", rubric: normalizeRubric(o.rubric) };
  });
  return out.length ? out : DEFAULT_PLAN.map((r) => structuredClone(r));
}

/** Grow or shrink the plan to `n` rounds, keeping existing rows. */
export function resizePlan(plan: PlanRound[], n: number): PlanRound[] {
  const size = Math.min(PLAN_MAX, Math.max(PLAN_MIN, n));
  if (size <= plan.length) return plan.slice(0, size);
  const extra: PlanRound[] = [];
  for (let i = plan.length; i < size; i++) {
    const t = INTERVIEW_TYPES[Math.min(i, INTERVIEW_TYPES.length - 1)]!;
    extra.push({ type: t[0], name: t[1], duration_minutes: 45, ...structuredClone(defaultKit(t[0])) });
  }
  return [...plan, ...extra];
}

/** First problem, or null. */
export function validatePlan(plan: PlanRound[]): string | null {
  if (plan.length < PLAN_MIN || plan.length > PLAN_MAX) return `Plan between ${PLAN_MIN} and ${PLAN_MAX} rounds.`;
  for (let i = 0; i < plan.length; i++) {
    const n = plan[i]!.name.trim();
    if (n.length < 2) return `Name round ${i + 1}.`;
    if (n.length > 60) return `Round ${i + 1} name must be 60 characters or fewer.`;
  }
  return null;
}

export type RoundState = "passed" | "concern" | "awaiting_scorecard" | "scheduled" | "pending";
export type RoundStep<I> = { round: number; name: string; state: RoundState; interview?: I; recommendation?: string; rating?: number };

type Iv = { interview_id: string; round_number?: number | null; interview_type: string; custom_round_name?: string | null; scheduled_at: string; duration_minutes: number; status?: string };
type Sc = { interview_id: string; recommendation: string; rating: number };

/** Round-by-round progress of one candidate against the job's plan. Extra ad-hoc rounds are appended. */
export function roundProgress<I extends Iv>(plan: PlanRound[], interviews: I[], scorecards: Sc[], now = Date.now()): RoundStep<I>[] {
  const live = interviews.filter((i) => i.status !== "cancelled");
  const maxRound = Math.max(plan.length, ...live.map((i) => i.round_number ?? 1));
  const steps: RoundStep<I>[] = [];
  for (let r = 1; r <= maxRound; r++) {
    const ivs = live.filter((i) => (i.round_number ?? 1) === r).sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
    const iv = ivs[0];
    const planned = plan[r - 1];
    const name = iv ? (iv.interview_type === CUSTOM_TYPE && iv.custom_round_name?.trim() ? iv.custom_round_name.trim() : planned?.name ?? typeName(iv.interview_type) ?? "Interview") : planned?.name ?? "Interview";
    if (!iv) { steps.push({ round: r, name, state: "pending" }); continue; }
    const sc = scorecards.find((s) => s.interview_id === iv.interview_id);
    if (sc) { steps.push({ round: r, name, state: sc.recommendation.endsWith("hire") ? "passed" : "concern", interview: iv, recommendation: sc.recommendation, rating: sc.rating }); continue; }
    const ended = new Date(iv.scheduled_at).getTime() + iv.duration_minutes * 60000 <= now;
    steps.push({ round: r, name, state: ended ? "awaiting_scorecard" : "scheduled", interview: iv });
  }
  return steps;
}

/** The first round that still needs scheduling, if any. */
export const nextPendingRound = <I>(steps: RoundStep<I>[]) => steps.find((s) => s.state === "pending");

/** Used when scheduling an ad-hoc chat for a shortlisted finalist: every round slot is a 30-min follow-up. */
export const FOLLOW_UP_PLAN: PlanRound[] = Array.from({ length: 20 }, () => ({ type: CUSTOM_TYPE, name: "Follow-up / Executive Chat", duration_minutes: 30 }));

export type Performance = { scored: number; passed: number; concerns: number; avg: number | null };

/** Summary of a candidate's scored rounds (ratings 1–5). */
export function interviewPerformance<I>(steps: RoundStep<I>[]): Performance {
  const scored = steps.filter((s) => s.state === "passed" || s.state === "concern");
  const ratings = scored.map((s) => s.rating ?? 0).filter((r) => r > 0);
  return {
    scored: scored.length,
    passed: scored.filter((s) => s.state === "passed").length,
    concerns: scored.filter((s) => s.state === "concern").length,
    avg: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
  };
}

/** Fair interview ranking: no-concern candidates first, then more rounds passed, then higher average rating. Unscored last. */
export function compareByInterview(a: Performance, b: Performance): number {
  if (!a.scored !== !b.scored) return a.scored ? -1 : 1;
  return (a.concerns > 0 ? 1 : 0) - (b.concerns > 0 ? 1 : 0) || b.passed - a.passed || (b.avg ?? 0) - (a.avg ?? 0);
}

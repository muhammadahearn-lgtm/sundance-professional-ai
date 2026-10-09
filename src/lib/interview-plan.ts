import { INTERVIEW_TYPES, CUSTOM_TYPE } from "./interview-rules";

/** One planned interview round for a job. Position in the array = round number. */
export type PlanRound = { type: string; name: string; duration_minutes: number };

export const PLAN_MIN = 1;
export const PLAN_MAX = 5;
export const PLAN_DURATIONS = [30, 45, 60, 90];

export const DEFAULT_PLAN: PlanRound[] = [
  { type: "screen", name: "Initial Screen", duration_minutes: 30 },
  { type: "technical", name: "Technical Deep Dive", duration_minutes: 60 },
  { type: "final", name: "Final Round", duration_minutes: 45 },
];

const typeName = (t: string) => INTERVIEW_TYPES.find(([k]) => k === t)?.[1] ?? "";

/** Clean any stored value into a valid plan (falls back to the default). */
export function normalizePlan(v: unknown): PlanRound[] {
  if (!Array.isArray(v)) return DEFAULT_PLAN.map((r) => ({ ...r }));
  const out = v.slice(0, PLAN_MAX).map((r): PlanRound => {
    const o = (r ?? {}) as Partial<PlanRound>;
    const type = typeof o.type === "string" && (o.type === CUSTOM_TYPE || INTERVIEW_TYPES.some(([k]) => k === o.type)) ? o.type : CUSTOM_TYPE;
    const name = (typeof o.name === "string" ? o.name.trim() : "").slice(0, 60) || typeName(type) || "Interview";
    const d = Number(o.duration_minutes);
    return { type, name, duration_minutes: Number.isFinite(d) && d >= 10 && d <= 480 ? Math.round(d) : 45 };
  });
  return out.length ? out : DEFAULT_PLAN.map((r) => ({ ...r }));
}

/** Grow or shrink the plan to `n` rounds, keeping existing rows. */
export function resizePlan(plan: PlanRound[], n: number): PlanRound[] {
  const size = Math.min(PLAN_MAX, Math.max(PLAN_MIN, n));
  if (size <= plan.length) return plan.slice(0, size);
  const extra: PlanRound[] = [];
  for (let i = plan.length; i < size; i++) {
    const t = INTERVIEW_TYPES[Math.min(i, INTERVIEW_TYPES.length - 1)]!;
    extra.push({ type: t[0], name: t[1], duration_minutes: 45 });
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

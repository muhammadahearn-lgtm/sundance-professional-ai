import { formatSalaryAmount } from "./salary";

export const DISPOSITION_REASONS = [
  ["underqualified", "Under-qualified for level"],
  ["failed_assessment", "Failed interview / assessment"],
  ["compensation", "Compensation mismatch"],
  ["timing", "Timing / availability"],
  ["better_fit", "Better-fit candidate selected"],
  ["culture", "Team or role fit"],
  ["other", "Other"],
] as const;
export type DispositionReason = (typeof DISPOSITION_REASONS)[number][0];

/** Warn when this offer could push hires past the job's open spots. Returns null when safe. */
export function overOfferWarning(headcount: number, hired: number, pendingOthers: number): string | null {
  const open = Math.max(0, headcount - hired);
  if (pendingOthers < open) return null;
  if (open === 0) return `All ${headcount} spot${headcount > 1 ? "s are" : " is"} already filled. Sending this offer may over-hire.`;
  return `${open} spot${open > 1 ? "s" : ""} open, but ${pendingOthers} other offer${pendingOthers > 1 ? "s are" : " is"} already pending. If everyone accepts, you'll over-hire.`;
}

/** Flag salary typos: far below the posted minimum or far above the posted maximum. */
export function salaryWarning(amount: number | null, min: number | null | undefined, max: number | null | undefined, cur: string): string | null {
  if (!amount) return null;
  if (min && amount < min * 0.5) return `${formatSalaryAmount(amount, cur)} is far below this job's posted minimum (${formatSalaryAmount(min, cur)}). Missing a zero?`;
  if (max && amount > max * 1.5) return `${formatSalaryAmount(amount, cur)} is far above this job's posted maximum (${formatSalaryAmount(max, cur)}). Extra zero?`;
  return null;
}

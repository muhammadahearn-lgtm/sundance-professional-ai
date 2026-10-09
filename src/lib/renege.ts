/** Post-hire renege rules (mirrored by the `record_hire_renege` RPC). */
export const RENEGE_REASONS: [string, string][] = [
  ["counter_offer", "Accepted a counter-offer"],
  ["personal", "Personal or family reasons"],
  ["visa", "Visa or work authorization issue"],
  ["compensation", "Compensation or relocation issue"],
  ["no_show", "Ghosted or didn't show up"],
  ["other", "Other"],
];
export const RENEGE_NOTE_MAX = 1000;

export function renegeReasonLabel(key: string | null | undefined): string {
  return RENEGE_REASONS.find(([k]) => k === key)?.[1] ?? "Backed out";
}

/** Only a hired card can be reported as a renege. */
export function canReportRenege(stage: string, renegedAt?: string | null): boolean {
  return stage === "hired" && !renegedAt;
}

type Runner = { candidate_id: string; current_stage: string; withdrawnAt?: string | null; renegedAt?: string | null };
/** Runners-up worth fast-tracking: closed-out cards on this job that didn't withdraw or back out themselves, silver medalists first. */
export function fastTrackCandidates<T extends Runner>(cards: T[], excludeId: string, silverIds: Set<string>): T[] {
  return cards
    .filter((c) => c.candidate_id !== excludeId && c.current_stage === "rejected" && !c.withdrawnAt && !c.renegedAt)
    .sort((a, b) => Number(silverIds.has(b.candidate_id)) - Number(silverIds.has(a.candidate_id)));
}

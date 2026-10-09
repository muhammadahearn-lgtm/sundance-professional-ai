/** Candidate self-withdrawal rules (mirrored by the `withdraw_application` RPC). */
export const WITHDRAW_REASONS: [string, string][] = [
  ["accepted_other_offer", "Accepted another offer"],
  ["compensation", "Compensation mismatch"],
  ["timing", "Personal or timing reasons"],
  ["role_fit", "Role is not the right fit"],
  ["location", "Location or work arrangement"],
  ["other", "Other"],
];
export const WITHDRAW_NOTE_MAX = 500;

export function withdrawReasonLabel(key: string | null | undefined): string {
  return WITHDRAW_REASONS.find(([k]) => k === key)?.[1] ?? "Withdrew";
}

/** Candidates can step down at any active stage, but not once hired or closed. */
export function canWithdraw(status: string, withdrawnAt?: string | null): boolean {
  return !withdrawnAt && status !== "hired" && status !== "rejected";
}

import type { Stage } from "./talent-rules";

/** Forward order of active pipeline stages; hired/rejected are terminal. */
const ORDER: Stage[] = ["contacted", "interviewing", "shortlisted", "offer", "hired"];
const LABEL: Record<Stage, string> = { saved: "Saved", contacted: "Contacted", interviewing: "Interviewing", shortlisted: "Shortlisted", offer: "Offer", hired: "Hired", rejected: "Not Moving Forward" };

export function isBackwardMove(from: Stage, to: Stage): boolean {
  const a = ORDER.indexOf(from), b = ORDER.indexOf(to);
  return a >= 0 && b >= 0 && b < a;
}

/** Hired candidates are locked while the job is closed; reopening (e.g. a renege) unlocks them. */
export function canMoveCard(from: Stage, jobStatus?: string | null): boolean { return from !== "hired" || (!!jobStatus && jobStatus !== "closed"); }

/** Only auto-open the scheduler when entering Interviewing forward (from Contacted) without a booked interview. */
export function shouldAutoSchedule(from: Stage, to: Stage, hasUpcoming: boolean): boolean {
  return to === "interviewing" && !hasUpcoming && !isBackwardMove(from, to);
}

/** Moving out of Offer backward with a pending offer must withdraw it first. */
export function needsOfferWithdrawal(from: Stage, to: Stage, offerStatus: string | null | undefined): boolean {
  return from === "offer" && to !== "hired" && offerStatus === "pending";
}

export function moveToast(from: Stage, to: Stage): string {
  if (to === "rejected") return "Marked Not Moving Forward";
  if (to === "offer") return "Offer Extended";
  if (to === "hired") return "Candidate Hired";
  return isBackwardMove(from, to) ? `Moved back to ${LABEL[to]}` : `Advanced to ${LABEL[to]}`;
}

/** Why a manual move to Hired needs a check: the candidate hasn't accepted, or there's no offer on record. */
export type HireCheck = "ok" | "pending_offer" | "no_offer";
export function hireCheck(offerStatus: string | null | undefined): HireCheck {
  if (offerStatus === "accepted") return "ok";
  if (offerStatus === "pending") return "pending_offer";
  return "no_offer";
}

/** Active stages jumped over by a forward move (e.g. Contacted → Offer skips Interviewing, Shortlisted). */
export function skippedStages(from: Stage, to: Stage): string[] {
  const a = ORDER.indexOf(from), b = ORDER.indexOf(to);
  if (a < 0 || b < 0 || b - a < 2) return [];
  return ORDER.slice(a + 1, b).map((s) => LABEL[s]);
}

/** Simple moves between working stages can be undone from the toast; terminal or offer moves cannot. */
export function canUndoMove(from: Stage, to: Stage): boolean {
  const simple: Stage[] = ["contacted", "interviewing", "shortlisted"];
  return simple.includes(from) && simple.includes(to);
}

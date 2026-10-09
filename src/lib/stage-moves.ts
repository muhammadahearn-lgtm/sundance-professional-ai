import type { Stage } from "./talent-rules";

/** Forward order of active pipeline stages; hired/rejected are terminal. */
const ORDER: Stage[] = ["contacted", "interviewing", "shortlisted", "offer", "hired"];
const LABEL: Record<Stage, string> = { saved: "Saved", contacted: "Contacted", interviewing: "Interviewing", shortlisted: "Shortlisted", offer: "Offer", hired: "Hired", rejected: "Not Moving Forward" };

export function isBackwardMove(from: Stage, to: Stage): boolean {
  const a = ORDER.indexOf(from), b = ORDER.indexOf(to);
  return a >= 0 && b >= 0 && b < a;
}

/** Hired candidates are locked: the job closed and others were let go. */
export function canMoveCard(from: Stage): boolean { return from !== "hired"; }

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

/** Applicant-pool insights for candidates. Aggregate counts only — never individual applicants. */

/** Launch: free for everyone to test. Flip to false to gate behind Sundance Pro. */
export const INSIGHTS_FREE_PREVIEW = true;

export function canViewApplicationInsights(isPro: boolean): boolean {
  return INSIGHTS_FREE_PREVIEW || isPro;
}

/** Insights unlock once the candidate is in the active hiring process (not just applied). */
export const INSIGHT_STATUSES = ["viewed", "recruiter_contacted", "interviewing", "offer", "hired"];
export function insightsEligible(status: string): boolean {
  return INSIGHT_STATUSES.includes(status);
}

export type Insights = { total: number; inReview: number; interviewing: number; offers: number; active: number; status: string };

/** One supportive sentence about where the candidate stands. */
export function standingText(i: Insights): string {
  if (!i.total) return "";
  if (i.status === "interviewing") return `You're 1 of ${i.interviewing} candidate${i.interviewing === 1 ? "" : "s"} interviewing, out of ${i.total} applicant${i.total === 1 ? "" : "s"}.`;
  if (i.status === "offer" || i.status === "hired") return `You reached the offer stage — ahead of ${Math.max(0, i.total - i.offers)} other applicant${i.total - i.offers === 1 ? "" : "s"}.`;
  return `You're in review alongside ${i.active} active candidate${i.active === 1 ? "" : "s"}, out of ${i.total} total.`;
}

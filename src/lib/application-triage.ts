/** Recruiter Applications page triage tabs. Viewing never leaves the Inbox; only a pipeline move or a decision does. */
export const TRIAGE_TABS = [["inbox", "Inbox"], ["pipeline", "In Pipeline"], ["archived", "Archived"], ["all", "All"]] as const;
export type TriageTab = (typeof TRIAGE_TABS)[number][0];

const PIPELINE_STATUSES = ["recruiter_contacted", "interviewing", "offer", "hired"];

export function triageBucket(status: string, inPipeline: boolean): Exclude<TriageTab, "all"> {
  if (status === "rejected") return "archived";
  if (inPipeline || PIPELINE_STATUSES.includes(status)) return "pipeline";
  return "inbox";
}

export function inTriageTab(tab: TriageTab, status: string, inPipeline: boolean): boolean {
  return tab === "all" || triageBucket(status, inPipeline) === tab;
}

/** Only Inbox applicants can be bulk-selected. */
export const canBulkSelect = (status: string, inPipeline: boolean) => triageBucket(status, inPipeline) === "inbox";

/** First n bulk-selectable ids from an already-sorted list. */
export function topIds<T>(rows: T[], n: number, id: (r: T) => string, eligible: (r: T) => boolean): string[] {
  return rows.filter(eligible).slice(0, n).map(id);
}

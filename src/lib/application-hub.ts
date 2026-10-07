/** Pure grouping rules for the candidate Applications hub. */
export type HubTab = "all" | "active" | "interviewing" | "offers" | "closed";

export const HUB_TABS: { key: HubTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "In Review" },
  { key: "interviewing", label: "Interviewing" },
  { key: "offers", label: "Offers" },
  { key: "closed", label: "Closed" },
];

export const INTRO_NOTE_MAX = 300;

export function hubTab(status: string): Exclude<HubTab, "all"> {
  if (status === "interviewing") return "interviewing";
  if (status === "offer" || status === "hired") return "offers";
  if (status === "rejected") return "closed";
  return "active";
}

export function matchesTab(status: string, tab: HubTab) {
  return tab === "all" || hubTab(status) === tab;
}

export function hubCounts(statuses: string[]) {
  const c = { all: statuses.length, active: 0, interviewing: 0, offers: 0, closed: 0 };
  for (const s of statuses) c[hubTab(s)]++;
  return c;
}

/** Next step shown on each application card. */
export function nextStep(status: string, hasUpcomingInterview: boolean, hasPendingOffer: boolean) {
  if (hasPendingOffer) return "Review your offer";
  if (hasUpcomingInterview) return "Interview scheduled";
  switch (status) {
    case "applied": return "Waiting for the recruiter to review";
    case "viewed": return "The recruiter viewed your application";
    case "recruiter_contacted": return "The recruiter reached out — check messages";
    case "interviewing": return "Interviews in progress";
    case "offer": return "Offer stage";
    case "hired": return "You're hired — congratulations";
    default: return "This role is closed — keep exploring";
  }
}

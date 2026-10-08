// Privacy-safe candidate comparison summary for the job's hiring team.
// Only first name + last initial, role, experience, match score and strengths —
// never email, phone, links, salary or full last name.

export type ShareCandidate = { firstName: string; lastName: string; jobTitle: string; years: number | null; score: number | null; strengths: string[] };

export const COMPARE_SHARE_MAX = 4;

export function shortName(first: string, last: string): string {
  const l = last.trim().charAt(0);
  return [first.trim(), l ? `${l.toUpperCase()}.` : ""].filter(Boolean).join(" ") || "Candidate";
}

export function buildCompareSummary(jobTitle: string, list: ShareCandidate[]): string {
  const sorted = [...list].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return sorted.map((c, i) => {
    const bits = [c.jobTitle, c.years != null ? `${c.years} yrs` : "", c.score != null ? `${Math.round(c.score)}% match` : "No score yet"].filter(Boolean).join(" · ");
    const s = c.strengths.slice(0, 3);
    return `${i + 1}. ${shortName(c.firstName, c.lastName)} — ${bits}${s.length ? `\n   Strengths: ${s.join(", ")}` : ""}`;
  }).join("\n") + `\n\nWhich candidate would you invite to apply for ${jobTitle}? Reply to your recruiter with your pick.`;
}

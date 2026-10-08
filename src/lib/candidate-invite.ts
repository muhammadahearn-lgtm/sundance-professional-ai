/** Default "Invite to Apply" message a recruiter can edit before sending. */
export function inviteMessage(candidateName: string, jobTitle: string, company: string, strengths: string[]): string {
  const first = (candidateName || "there").trim().split(/\s+/)[0] || "there";
  const top = strengths.filter(Boolean).slice(0, 3);
  const why = top.length ? ` Your experience with ${top.length > 1 ? `${top.slice(0, -1).join(", ")} and ${top[top.length - 1]}` : top[0]} stood out.` : "";
  return `Hi ${first}, I'd love for you to apply to our ${jobTitle} role at ${company}.${why} Would you be open to taking a look?`;
}

export type CareerModeTag = { label: string; tone: "success" | "warning" | "muted" };
/** Recruiter-facing tag for a candidate's career mode. */
export function careerModeTag(mode: string | null | undefined): CareerModeTag {
  if (mode === "passive") return { label: "Open to the Right Opportunity", tone: "warning" };
  if (mode === "not_looking") return { label: "Employed & Not Looking", tone: "muted" };
  return { label: "Actively Looking", tone: "success" };
}

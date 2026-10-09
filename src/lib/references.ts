// Optional structured reference checks. Recruiters request, candidates name
// referees, referees answer through a no-login link. Answers are recruiter-only.

export const REFERENCE_TTL_DAYS = 14;
export const REFERENCE_STAGES = ["interviewing", "shortlisted", "offer"] as const;
export const RELATIONSHIPS = [
  { value: "manager", label: "Direct Manager" },
  { value: "peer", label: "Peer / Colleague" },
  { value: "direct_report", label: "Direct Report" },
  { value: "mentor", label: "Mentor" },
  { value: "client", label: "Client" },
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number]["value"];

export function relationshipLabel(v: string): string {
  return RELATIONSHIPS.find((r) => r.value === v)?.label ?? v;
}

export function canRequestReferences(stage: string | null | undefined): boolean {
  return !!stage && (REFERENCE_STAGES as readonly string[]).includes(stage);
}

export interface RefInput { name: string; email: string; relationship: string; company: string; workedTogether: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns an error message, or null when the list is valid. */
export function validateReferences(refs: RefInput[], target: number, candidateEmail?: string | null): string | null {
  if (refs.length !== target) return `Please add exactly ${target} reference${target === 1 ? "" : "s"}.`;
  const seen = new Set<string>();
  for (const r of refs) {
    if (!r.name.trim()) return "Each reference needs a name.";
    const e = r.email.trim().toLowerCase();
    if (!EMAIL.test(e)) return `"${r.email}" is not a valid email.`;
    if (candidateEmail && e === candidateEmail.trim().toLowerCase()) return "You can't list yourself as a reference.";
    if (seen.has(e)) return "Each reference needs a different email.";
    seen.add(e);
    if (!RELATIONSHIPS.some((x) => x.value === r.relationship)) return "Choose how you know each reference.";
  }
  return null;
}

/** Badge text for pipeline cards, e.g. "References: 1/2". */
export function referenceProgress(target: number, completed: number, status: string): { label: string; done: boolean } {
  if (status === "awaiting_candidate") return { label: "References requested", done: false };
  return { label: `References: ${Math.min(completed, target)}/${target}`, done: completed >= target };
}

export function referenceNoteText(r: { name: string; relationship: string; company: string; rating: number; strengths: string; growth: string; rehire: string; confirmed: boolean }): string {
  const lines = [
    `Reference from ${r.name} (${relationshipLabel(r.relationship)}${r.company ? `, ${r.company}` : ""})`,
    `Would work with them again: ${r.rating}/5${r.confirmed ? "" : " · relationship details not confirmed"}`,
  ];
  if (r.strengths.trim()) lines.push(`Strengths: ${r.strengths.trim()}`);
  if (r.growth.trim()) lines.push(`Areas to grow: ${r.growth.trim()}`);
  if (r.rehire.trim()) lines.push(`Comment: ${r.rehire.trim()}`);
  return lines.join("\n").slice(0, 2000);
}

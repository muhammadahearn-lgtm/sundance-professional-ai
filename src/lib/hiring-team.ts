import { z } from "zod";
import type { Stage } from "./talent-rules";

export const HIRING_ROLES = ["Hiring Manager", "Technical Interviewer", "Team Lead", "Client Stakeholder", "HR Partner", "Executive Sponsor"];
export const TEAM_MAX = 10;

export const stakeholderSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be under 100 characters"),
  hiring_role: z.string().trim().min(1, "Role is required").max(60, "Role must be under 60 characters"),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(255),
});

/** Pipeline stages that send a "shortlist" update to the hiring team. */
const SHORTLIST_STAGES: Stage[] = ["shortlisted", "offer", "hired"];
export function stageAlertsTeam(stage: Stage): boolean {
  return SHORTLIST_STAGES.includes(stage);
}

export function isDuplicateEmail(list: { email: string }[], email: string): boolean {
  const e = email.trim().toLowerCase();
  return list.some((s) => s.email.toLowerCase() === e);
}

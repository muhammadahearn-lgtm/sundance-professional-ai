export const SUMMARY_MAX = 2000;
export const RESUME_MAX_BYTES = 10 * 1024 * 1024;
export const RESUME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export type CompletionInput = {
  jobTitle: string;
  headline: string;
  location: string;
  yearsExperience: number | null;
  summary: string;
  experienceCount: number;
  educationCount: number;
  certificationCount: number;
  skillCount: number;
  languageCount: number;
  technologyCount: number;
  targetRoleCount: number;
  salaryExpectation: string;
  hasResume: boolean;
};

/** Weights add up to 100. */
export const COMPLETION_WEIGHTS = {
  professional: 20,
  experience: 15,
  education: 10,
  certifications: 5,
  skills: 15,
  technologies: 10,
  preferences: 15,
  resume: 10,
} as const;

export function computeCompletion(i: CompletionInput): { percent: number; recommendations: string[] } {
  const w = COMPLETION_WEIGHTS;
  const recs: string[] = [];
  let score = 0;
  const professional = !!(i.jobTitle.trim() && i.headline.trim() && i.location.trim() && i.yearsExperience !== null && i.summary.trim());
  if (professional) score += w.professional; else recs.push("Complete your Professional Information to increase profile completion.");
  if (i.experienceCount > 0) score += w.experience; else recs.push("Add Work Experience to increase profile completion.");
  if (i.educationCount > 0) score += w.education; else recs.push("Add Education to increase profile completion.");
  if (i.certificationCount > 0) score += w.certifications; else recs.push("Add Certifications to increase profile completion.");
  if (i.skillCount > 0 || i.languageCount > 0) score += w.skills; else recs.push("Add Technical Skills to increase profile completion.");
  if (i.technologyCount > 0) score += w.technologies; else recs.push("Add Technologies to increase profile completion.");
  if (i.targetRoleCount > 0 && i.salaryExpectation.trim()) score += w.preferences; else recs.push("Complete your Career Preferences to increase profile completion.");
  if (i.hasResume) score += w.resume; else recs.push("Upload a resume or publish your Sundance Standard Resume to increase profile completion.");
  return { percent: score, recommendations: recs };
}

export type ProfessionalInput = { jobTitle: string; headline: string; location: string; yearsExperience: string; summary: string };

export function validateProfessional(p: ProfessionalInput): Partial<Record<keyof ProfessionalInput, string>> {
  const e: Partial<Record<keyof ProfessionalInput, string>> = {};
  if (!p.jobTitle.trim()) e.jobTitle = "Current role is required.";
  if (!p.headline.trim()) e.headline = "Headline is required.";
  if (!p.location.trim()) e.location = "Location is required.";
  const y = Number(p.yearsExperience);
  if (p.yearsExperience.trim() === "" || !Number.isInteger(y) || y < 0 || y > 60) e.yearsExperience = "Enter years of experience (0–60).";
  if (p.summary.length > SUMMARY_MAX) e.summary = `Summary must be ${SUMMARY_MAX} characters or fewer.`;
  return e;
}

export function validateResumeFile(f: { type: string; size: number; name: string }): string | null {
  const ext = f.name.split(".").pop()?.toLowerCase();
  if (!RESUME_TYPES[f.type] && ext !== "pdf" && ext !== "docx") return "Resume upload failed: only PDF or DOCX files are supported.";
  if (f.size > RESUME_MAX_BYTES) return "Resume upload failed: file must be 10 MB or smaller.";
  return null;
}

/** Required-for-search items still missing. */
export function missingRequired(i: Pick<CompletionInput, "skillCount" | "technologyCount" | "targetRoleCount" | "jobTitle" | "headline" | "location">): string[] {
  const m: string[] = [];
  if (!i.jobTitle.trim()) m.push("Current role");
  if (!i.headline.trim()) m.push("Headline");
  if (!i.location.trim()) m.push("Location");
  if (i.skillCount < 1) m.push("At least one skill");
  if (i.technologyCount < 1) m.push("At least one technology");
  if (i.targetRoleCount < 1) m.push("At least one target role");
  return m;
}

export const STANDARD_RESUME_PREMIUM_PREVIEW = true;
export const STANDARD_RESUME_MAX_SOFT_SKILLS = 5;

export const SPOKEN_LANGUAGE_LEVELS = [
  ["native_bilingual", "Native / Bilingual"],
  ["fluent", "Fluent"],
  ["professional", "Professional"],
  ["conversational", "Conversational"],
  ["basic", "Basic"],
] as const;

export type SpokenLanguageLevel = (typeof SPOKEN_LANGUAGE_LEVELS)[number][0];
export type ResumeChoice = "original" | "standard";
export type StandardResumeSection = "summary" | "experience" | "skills" | "technologies" | "programming_languages" | "soft_skills" | "education" | "certifications" | "spoken_languages" | "projects";

export const DEFAULT_STANDARD_RESUME_SECTIONS: StandardResumeSection[] = [
  "summary", "experience", "skills", "technologies", "programming_languages", "soft_skills", "education", "certifications", "spoken_languages", "projects",
];

export const STANDARD_RESUME_SECTION_LABELS: Record<StandardResumeSection, string> = {
  summary: "Professional Summary", experience: "Work Experience", skills: "Technical Skills",
  technologies: "Tools & Technologies", programming_languages: "Programming Languages",
  soft_skills: "Top Soft Skills", education: "Education", certifications: "Certifications",
  spoken_languages: "Spoken Languages", projects: "Projects",
};

export type StandardResumeSnapshot = {
  name: string;
  headline: string;
  location: string;
  links: { label: string; url: string }[];
  summary: string;
  experience: { title: string; company: string; location: string; start: string | null; end: string | null; current: boolean; responsibilities: string; achievements: string; technologies: string[] }[];
  skills: string[];
  technologies: string[];
  programmingLanguages: string[];
  softSkills: string[];
  education: { institution: string; degree: string; field: string; year: number | null }[];
  certifications: { name: string; issuer: string; issued: string | null }[];
  spokenLanguages: { name: string; proficiency: string }[];
  projects: { title: string; description: string; url: string; technologies: string[] }[];
};

export function chosenResume(choice: ResumeChoice, hasOriginal: boolean, hasStandard: boolean): ResumeChoice | null {
  if (choice === "standard" && hasStandard) return "standard";
  if (choice === "original" && hasOriginal) return "original";
  if (hasStandard) return "standard";
  if (hasOriginal) return "original";
  return null;
}

export function nextStandardResumeVersion(existing: number[]): number {
  return Math.max(0, ...existing.filter((n) => Number.isInteger(n) && n > 0)) + 1;
}

export function validSoftSkillSelection(ids: string[]): boolean {
  return new Set(ids).size === ids.length && ids.length <= STANDARD_RESUME_MAX_SOFT_SKILLS;
}

export function spokenLanguageLevelLabel(level: string): string {
  return SPOKEN_LANGUAGE_LEVELS.find(([key]) => key === level)?.[1] ?? level;
}

/** Two-column A4 layout: sidebar = education/certs + skills/languages; main = profile + experience/projects. */
export type ResumeBlock = "summary" | "experience" | "education" | "skills";
const SIDE_MEMBERS: Record<"education" | "skills", StandardResumeSection[]> = {
  education: ["education", "certifications"],
  skills: ["skills", "programming_languages", "technologies", "soft_skills", "spoken_languages"],
};
export function splitResumeColumns(sections: StandardResumeSection[]): { side: ResumeBlock[]; main: ResumeBlock[] } {
  const side: ResumeBlock[] = (["education", "skills"] as const).filter((b) => SIDE_MEMBERS[b].some((s) => sections.includes(s)));
  const main: ResumeBlock[] = [];
  if (sections.includes("summary")) main.push("summary");
  if (sections.includes("experience") || sections.includes("projects")) main.push("experience");
  return { side, main };
}

export function resumePeriod(v: { start: string | null; end: string | null; current: boolean }): string {
  const f = (d: string | null) => d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
  return [f(v.start), v.current ? "Present" : f(v.end)].filter(Boolean).join(" – ");
}

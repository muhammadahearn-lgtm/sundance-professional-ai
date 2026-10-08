export const STANDARD_RESUME_PREMIUM_PREVIEW = true;
export const STANDARD_RESUME_MAX_SOFT_SKILLS = 5;
export const STANDARD_RESUME_KEEP_VERSIONS = 3;

export const SPOKEN_LANGUAGE_LEVELS = [
  ["native_bilingual", "Native"],
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
  technologies: "Technologies & Tools", programming_languages: "Programming Languages",
  soft_skills: "Top Soft Skills", education: "Education", certifications: "Certifications",
  spoken_languages: "Spoken Languages", projects: "Projects",
};

export type StandardResumeSnapshot = {
  name: string;
  headline: string;
  location: string;
  links: { label: string; url: string }[];
  summary: string;
  experience: { title: string; company: string; location: string; start: string | null; end: string | null; current: boolean; responsibilities: string; technologies: string[] }[];
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
  const side: ResumeBlock[] = SIDE_MEMBERS.skills.some((s) => sections.includes(s)) ? ["skills"] : [];
  const main: ResumeBlock[] = [];
  if (sections.includes("summary")) main.push("summary");
  if (sections.includes("experience") || sections.includes("projects")) main.push("experience");
  if (SIDE_MEMBERS.education.some((s) => sections.includes(s))) main.push("education");
  return { side, main };
}

export function resumePeriod(v: { start: string | null; end: string | null; current: boolean }): string {
  const f = (d: string | null) => d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
  return [f(v.start), v.current ? "Present" : f(v.end)].filter(Boolean).join(" – ");
}

/** Page budget: keeps most resumes to one A4 page and senior ones to a clean two. */
export const RESUME_LIMITS = { fullExperience: 4, certifications: 4, projects: 2, education: 3 } as const;
type Exp = StandardResumeSnapshot["experience"][number];
const expKey = (e: Exp) => `${e.current ? "9" : "0"}${e.end ?? e.start ?? ""}${e.start ?? ""}`;
export function budgetResume(s: StandardResumeSnapshot) {
  const exp = [...s.experience].sort((a, b) => expKey(b).localeCompare(expKey(a)));
  const certs = [...s.certifications].sort((a, b) => (b.issued ?? "").localeCompare(a.issued ?? ""));
  return {
    experience: exp.slice(0, RESUME_LIMITS.fullExperience),
    earlier: exp.slice(RESUME_LIMITS.fullExperience),
    certifications: certs.slice(0, RESUME_LIMITS.certifications),
    projects: s.projects.slice(0, RESUME_LIMITS.projects),
    education: s.education.slice(0, RESUME_LIMITS.education),
  };
}
/** Splits responsibilities into bullet items (one per line, leading -, *, • stripped). Single paragraph → one item. */
export function responsibilityItems(text: string): string[] {
  return (text ?? "").split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-*•▪–]|\d+[.)])\s*/, "").trim()).filter(Boolean);
}
/** "Engineer, Acme (2014–2016)" — compact line for older roles. */
export function earlierRoleLine(e: Exp): string {
  const yrs = [e.start?.slice(0, 4), e.current ? "Present" : e.end?.slice(0, 4)].filter(Boolean);
  const range = yrs.length === 2 && yrs[0] === yrs[1] ? yrs[0] : yrs.join("–");
  return `${e.title}${e.company ? `, ${e.company}` : ""}${range ? ` (${range})` : ""}`;
}

/** Public profile links shown as clickable icons; only safe http(s) URLs, never email. */
export function resumeLinks(snapshot: Pick<StandardResumeSnapshot, "links">): { label: string; url: string }[] {
  return (snapshot.links ?? []).flatMap((l) => {
    const raw = l.url.trim(); if (!raw || /^mailto:/i.test(raw)) return [];
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try { const u = new URL(url); return u.protocol === "https:" || u.protocol === "http:" ? [{ label: l.label, url: u.toString() }] : []; } catch { return []; }
  });
}

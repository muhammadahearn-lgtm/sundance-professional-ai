// Shared (client-safe) resume parsing contract: AI output schema + sanitizer.
// The AI only proposes values; candidates review everything before saving.

export const RESUME_TEXT_MIN = 80;
export const RESUME_TEXT_MAX = 40_000;
export const RESUME_FILE_MAX_BYTES = 5 * 1024 * 1024;

export type ParsedExperience = {
  company_name: string; job_title: string; location: string;
  start_date: string | null; end_date: string | null; current_position: boolean;
  responsibilities: string; technologies_used: string[];
};
export type ParsedEducation = { institution_name: string; degree: string; field_of_study: string; graduation_year: number | null };
export type ParsedCertification = { certification_name: string; issuing_organization: string; issue_date: string | null };
export type ParsedProject = { title: string; description: string; project_url: string };

export type ParsedResume = {
  full_name: string; job_title: string; years_experience: number | null; current_employer: string;
  location_city: string; location_state: string; location_country: string;
  headline: string; summary: string;
  programming_languages: string[]; technical_skills: string[]; tools: string[]; soft_skills: string[];
  target_roles: string[];
  linkedin_url: string; github_url: string; portfolio_url: string;
  experience: ParsedExperience[]; education: ParsedEducation[]; certifications: ParsedCertification[]; projects: ParsedProject[];
};

const str = { type: "string" } as const;
const nstr = { type: ["string", "null"] } as const;
const arr = { type: "array", items: str } as const;
const obj = (props: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(props), properties: props });

/** Strict JSON schema (every property required, nullable when optional). */
export const RESUME_JSON_SCHEMA = obj({
  full_name: str, job_title: str, years_experience: { type: ["integer", "null"] }, current_employer: str,
  location_city: str, location_state: str, location_country: str, headline: str, summary: str,
  programming_languages: arr, technical_skills: arr, tools: arr, soft_skills: arr, target_roles: arr,
  linkedin_url: str, github_url: str, portfolio_url: str,
  experience: { type: "array", items: obj({ company_name: str, job_title: str, location: str, start_date: nstr, end_date: nstr, current_position: { type: "boolean" }, responsibilities: str, technologies_used: arr }) },
  education: { type: "array", items: obj({ institution_name: str, degree: str, field_of_study: str, graduation_year: { type: ["integer", "null"] } }) },
  certifications: { type: "array", items: obj({ certification_name: str, issuing_organization: str, issue_date: nstr }) },
  projects: { type: "array", items: obj({ title: str, description: str, project_url: str }) },
});

export const RESUME_INSTRUCTIONS = `You extract structured data from a technology professional's resume.
Rules:
- Use only information present in the resume. Never invent. Use "" / null / [] when missing.
- programming_languages: coding languages only (Python, TypeScript, SQL...). technical_skills: disciplines/concepts (Machine Learning, REST APIs, Data Modeling...). tools: products, frameworks, platforms, cloud, databases (React, AWS, Docker, Snowflake...). soft_skills: only if explicitly listed.
- Never put spoken languages (English, Spanish...) in programming_languages; mention notable ones in summary instead.
- job_title: most recent title without company. headline: one line under 120 chars. summary: under 1200 chars; fold notable awards, patents, publications, clearances into it.
- target_roles: 1-3 generic role names implied by the career (e.g. "Data Engineer"), without seniority words.
- years_experience: total professional years as an integer, estimated from dates if not stated.
- location_country: ISO 3166-1 alpha-2 code (e.g. "US"). location_state: state/province name or code.
- Dates: "YYYY-MM-DD" (use day 01 and month 01 when unknown); end_date null when current_position.
- URLs: full https URLs. Open-source work and side projects go to projects.
- Ignore references, hobbies, high-school details and personal identifiers (birth date, ID numbers, photos).`;

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const clipMulti = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max) : "");
const list = (v: unknown, max = 40, len = 60) => {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>(); const out: string[] = [];
  for (const x of v) { const s = clip(x, len); const k = s.toLowerCase(); if (s && !seen.has(k)) { seen.add(k); out.push(s); } if (out.length >= max) break; }
  return out;
};
const date = (v: unknown) => {
  if (typeof v !== "string") return null;
  const m = v.trim().match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!m) return null;
  const y = +m[1]; const mo = Math.min(12, Math.max(1, +(m[2] ?? 1))); const d = Math.min(28, Math.max(1, +(m[3] ?? 1)));
  if (y < 1950 || y > 2100) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};
const year = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 1950 && v <= 2100 ? v : null);
export function cleanUrl(v: unknown): string {
  const s = clip(v, 300); if (!s) return "";
  try { const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); return u.protocol.startsWith("http") && u.hostname.includes(".") ? u.toString() : ""; } catch { return ""; }
}
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** Coerce untrusted AI output into a safe ParsedResume (never throws). */
export function sanitizeParsedResume(raw: unknown): ParsedResume {
  const r = rec(raw);
  const ye = typeof r.years_experience === "number" && Number.isFinite(r.years_experience) ? Math.max(0, Math.min(60, Math.round(r.years_experience))) : null;
  const country = clip(r.location_country, 2).toUpperCase();
  return {
    full_name: clip(r.full_name, 120), job_title: clip(r.job_title, 120), years_experience: ye, current_employer: clip(r.current_employer, 120),
    location_city: clip(r.location_city, 80), location_state: clip(r.location_state, 80), location_country: /^[A-Z]{2}$/.test(country) ? country : "",
    headline: clip(r.headline, 160), summary: clipMulti(r.summary, 2000),
    programming_languages: list(r.programming_languages), technical_skills: list(r.technical_skills), tools: list(r.tools), soft_skills: list(r.soft_skills, 20),
    target_roles: list(r.target_roles, 5, 80),
    linkedin_url: cleanUrl(r.linkedin_url), github_url: cleanUrl(r.github_url), portfolio_url: cleanUrl(r.portfolio_url),
    experience: (Array.isArray(r.experience) ? r.experience : []).slice(0, 20).map((e) => {
      const x = rec(e); const current = x.current_position === true;
      return { company_name: clip(x.company_name, 120), job_title: clip(x.job_title, 120), location: clip(x.location, 120), start_date: date(x.start_date), end_date: current ? null : date(x.end_date), current_position: current, responsibilities: clipMulti(x.responsibilities, 2000), technologies_used: list(x.technologies_used, 30) };
    }).filter((e) => e.company_name && e.job_title),
    education: (Array.isArray(r.education) ? r.education : []).slice(0, 10).map((e) => {
      const x = rec(e); return { institution_name: clip(x.institution_name, 160), degree: clip(x.degree, 120), field_of_study: clip(x.field_of_study, 120), graduation_year: year(x.graduation_year) };
    }).filter((e) => e.institution_name),
    certifications: (Array.isArray(r.certifications) ? r.certifications : []).slice(0, 20).map((e) => {
      const x = rec(e); return { certification_name: clip(x.certification_name, 160), issuing_organization: clip(x.issuing_organization, 120), issue_date: date(x.issue_date) };
    }).filter((e) => e.certification_name),
    projects: (Array.isArray(r.projects) ? r.projects : []).slice(0, 10).map((e) => {
      const x = rec(e); return { title: clip(x.title, 120), description: clipMulti(x.description, 1000), project_url: cleanUrl(x.project_url) };
    }).filter((e) => e.title),
  };
}

/** Normalize extracted resume text before sending; returns error message or cleaned text. */
export function prepareResumeText(text: string): { ok: true; text: string } | { ok: false; error: string } {
  const t = (text ?? "").replace(/\u0000/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (t.length < RESUME_TEXT_MIN) return { ok: false, error: "We couldn't read enough text from this resume. Try a different file, or enter your details manually." };
  return { ok: true, text: t.slice(0, RESUME_TEXT_MAX) };
}

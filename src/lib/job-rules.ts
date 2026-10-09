import { parseSalaryInput } from "./salary";
import { DEFAULT_PLAN, validatePlan, type PlanRound } from "./interview-plan";
import { validateEquity, validateQuestions, type ScreeningQ } from "./screening";

export type JobStatus = "draft" | "active" | "paused" | "closed";
export type ReqLevel = "required" | "preferred" | "optional";
export type ReqItem = { id: string; level: ReqLevel };

export const DESCRIPTION_MAX = 10000;

export type JobForm = {
  job_title: string; custom_title: string; level_id: string; role_id: string; company_id: string; employment_type: string; work_arrangement: string;
  location: string; location_country: string; location_state: string; location_city: string; minimum_years_experience: string; minimum_degree: string; experience_level: string; job_description: string;
  languages: ReqItem[]; skills: ReqItem[]; technologies: ReqItem[]; softSkills: ReqItem[];
  minimum_salary: string; maximum_salary: string; salary_currency: string; bonus_info: string; benefits_summary: string;
  is_confidential: boolean; confidential_label: string; max_applications: string; headcount: string;
  equity_type: string; equity_range: string; equity_vesting: string; screening: ScreeningQ[]; interview_plan: PlanRound[];
};

export const emptyJob = (company_id = ""): JobForm => ({
  job_title: "", custom_title: "", level_id: "", role_id: "", company_id, employment_type: "full_time", work_arrangement: "remote", location: "", location_country: "", location_state: "", location_city: "",
  minimum_years_experience: "", minimum_degree: "", experience_level: "", job_description: "", languages: [], skills: [], technologies: [], softSkills: [],
  minimum_salary: "", maximum_salary: "", salary_currency: "USD", bonus_info: "", benefits_summary: "", is_confidential: false, confidential_label: "", max_applications: "", headcount: "1",
  equity_type: "none", equity_range: "", equity_vesting: "", screening: [], interview_plan: DEFAULT_PLAN.map((r) => ({ ...r })),
});

type Errs = Partial<Record<keyof JobForm, string>>;

function validateComp(f: JobForm): Errs {
  const e: Errs = { ...validateSalary(f), ...validateEquity(f) };
  const planErr = validatePlan(f.interview_plan ?? []); if (planErr) e.interview_plan = planErr;
  if (Object.keys(validateQuestions(f.screening)).length) e.screening = "Fix the highlighted screening questions.";
  return e;
}

export function validateInfo(f: JobForm): Errs {
  const e: Errs = {};
  if (!f.role_id) e.role_id = "Role is required.";
  if (!f.level_id) e.level_id = "Level is required.";
  if (f.custom_title.trim().length > 120) e.custom_title = "Keep the custom title under 120 characters.";
  if (!f.company_id) e.company_id = "Pick or add the company you are hiring for.";
  if (!f.employment_type) e.employment_type = "Employment type is required.";
  if (!f.work_arrangement) e.work_arrangement = "Work arrangement is required.";
  if (!f.location_country.trim() || !f.location_state.trim() || !f.location_city.trim()) e.location = "Country, state / province and city are required.";
  const y = Number(f.minimum_years_experience);
  if (f.minimum_years_experience.trim() === "" || !Number.isInteger(y) || y < 0 || y > 50) e.minimum_years_experience = "Enter minimum years of experience (0–50).";
  if (!f.job_description.trim()) e.job_description = "Description is required.";
  else if (f.job_description.length > DESCRIPTION_MAX) e.job_description = `Keep it under ${DESCRIPTION_MAX} characters.`;
  return e;
}

export function validateSalary(f: Pick<JobForm, "minimum_salary" | "maximum_salary">): Errs {
  const e: Errs = {};
  const a = parseSalaryInput(f.minimum_salary), b = parseSalaryInput(f.maximum_salary);
  if (!a.ok) e.minimum_salary = a.error;
  if (!b.ok) e.maximum_salary = b.error;
  const min = a.ok ? a.value : null, max = b.ok ? b.value : null;
  if (min !== null && max !== null && !e.minimum_salary && !e.maximum_salary && max <= min) e.maximum_salary = "Maximum salary must be greater than minimum salary.";
  return e;
}

/** Errors per wizard step (1-5). */
export function validateStep(step: number, f: JobForm): Errs {
  if (step === 1) return validateInfo(f);
  if (step === 3 && !f.skills.length) return { skills: "Add at least one technical skill." };
  if (step === 4 && !f.technologies.length) return { technologies: "Add at least one technology." };
  if (step === 5) return validateComp(f);
  return {};
}

export function validateAll(f: JobForm): Errs {
  return { ...validateInfo(f), ...validateStep(3, f), ...validateStep(4, f), ...validateComp(f) };
}

/** Quality: title 10, description 20, salary 15, skills 15, technologies 15, languages 10, experience 5, benefits 10. */
export function jobQuality(j: { title: string; description: string; minSalary: number | null; maxSalary: number | null; skills: number; technologies: number; languages: number; minYears: number | null; experienceLevel: string; benefits: string }) {
  const parts: [boolean, number, string][] = [
    [!!j.title.trim(), 10, "Add a job title"],
    [j.description.trim().length >= 200, 20, "Improve Description"],
    [j.minSalary !== null || j.maxSalary !== null, 15, "Add Salary Information"],
    [j.skills > 0, 15, "Add Technical Skills"],
    [j.technologies > 0, 15, "Add Technologies"],
    [j.languages > 0, 10, "Add Languages"],
    [j.minYears !== null && !!j.experienceLevel, 5, "Add Experience Requirements"],
    [!!j.benefits.trim(), 10, "Add Benefits"],
  ];
  return {
    percent: parts.reduce((s, [ok, w]) => s + (ok ? w : 0), 0),
    recommendations: parts.filter(([ok]) => !ok).map(([, , r]) => r),
  };
}

export type JobAction = "publish" | "pause" | "resume" | "close" | "reopen";
export function allowedActions(s: JobStatus): JobAction[] {
  switch (s) {
    case "draft": return ["publish", "close"];
    case "active": return ["pause", "close"];
    case "paused": return ["resume", "close"];
    case "closed": return ["reopen"];
  }
}
export function nextStatus(a: JobAction): JobStatus {
  return a === "pause" ? "paused" : a === "close" ? "closed" : "active";
}
export const canEdit = (s: JobStatus) => s !== "closed";
export const canDelete = (applicationCount: number) => applicationCount === 0;

/** Draft completion: role 15, level 10, description 20, location 10, skills 15, technologies 15, salary 10, languages 5. */
export function draftCompletion(f: Pick<JobForm, "role_id" | "level_id" | "job_description" | "location" | "skills" | "technologies" | "languages" | "minimum_salary" | "maximum_salary">) {
  const parts: [boolean, number][] = [
    [!!f.role_id, 15], [!!f.level_id, 10], [!!f.job_description.trim(), 20], [!!f.location.trim(), 10],
    [f.skills.length > 0, 15], [f.technologies.length > 0, 15], [!!(f.minimum_salary.trim() || f.maximum_salary.trim()), 10], [f.languages.length > 0, 5],
  ];
  return parts.reduce((s, [ok, w]) => s + (ok ? w : 0), 0);
}

/** Drafts can be saved with anything; only publishing validates. */
export const canPublish = (f: JobForm) => Object.keys(validateAll(f)).length === 0;

/** Openings for a requisition: whole number 1–99, defaults to 1. */
export function parseHeadcount(v: string | number | null | undefined): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 99) : 1;
}
/** Spots still open after counting hires. */
export function openSpots(headcount: number, hired: number): number { return Math.max(0, parseHeadcount(headcount) - Math.max(0, hired)); }

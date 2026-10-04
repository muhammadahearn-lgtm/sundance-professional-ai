export type JobStatus = "draft" | "active" | "paused" | "closed";
export type ReqLevel = "required" | "preferred" | "optional";
export type ReqItem = { id: string; level: ReqLevel };

export const DESCRIPTION_MAX = 10000;

export type JobForm = {
  job_title: string; role_id: string; company_id: string; employment_type: string; work_arrangement: string;
  location: string; minimum_years_experience: string; experience_level: string; job_description: string;
  languages: ReqItem[]; skills: ReqItem[]; technologies: ReqItem[];
  minimum_salary: string; maximum_salary: string; salary_currency: string; bonus_info: string; benefits_summary: string;
};

export const emptyJob = (company_id = ""): JobForm => ({
  job_title: "", role_id: "", company_id, employment_type: "full_time", work_arrangement: "remote", location: "",
  minimum_years_experience: "", experience_level: "", job_description: "", languages: [], skills: [], technologies: [],
  minimum_salary: "", maximum_salary: "", salary_currency: "USD", bonus_info: "", benefits_summary: "",
});

type Errs = Partial<Record<keyof JobForm, string>>;

export function validateInfo(f: JobForm): Errs {
  const e: Errs = {};
  if (!f.job_title.trim()) e.job_title = "Job title is required.";
  if (!f.role_id) e.role_id = "Role is required.";
  if (!f.company_id) e.company_id = "Company is required. Set up your company profile first.";
  if (!f.employment_type) e.employment_type = "Employment type is required.";
  if (!f.work_arrangement) e.work_arrangement = "Work arrangement is required.";
  if (!f.location.trim()) e.location = "Location is required.";
  const y = Number(f.minimum_years_experience);
  if (f.minimum_years_experience.trim() === "" || !Number.isInteger(y) || y < 0 || y > 50) e.minimum_years_experience = "Enter minimum years of experience (0–50).";
  if (!f.job_description.trim()) e.job_description = "Description is required.";
  else if (f.job_description.length > DESCRIPTION_MAX) e.job_description = `Keep it under ${DESCRIPTION_MAX} characters.`;
  return e;
}

export function validateSalary(f: Pick<JobForm, "minimum_salary" | "maximum_salary">): Errs {
  const e: Errs = {};
  const min = f.minimum_salary.trim() === "" ? null : Number(f.minimum_salary);
  const max = f.maximum_salary.trim() === "" ? null : Number(f.maximum_salary);
  if (min !== null && (!Number.isFinite(min) || min < 0)) e.minimum_salary = "Enter a valid amount.";
  if (max !== null && (!Number.isFinite(max) || max < 0)) e.maximum_salary = "Enter a valid amount.";
  if (min !== null && max !== null && !e.minimum_salary && !e.maximum_salary && max <= min) e.maximum_salary = "Maximum salary must be greater than minimum salary.";
  return e;
}

/** Errors per wizard step (1-5). */
export function validateStep(step: number, f: JobForm): Errs {
  if (step === 1) return validateInfo(f);
  if (step === 3 && !f.skills.length) return { skills: "Add at least one technical skill." };
  if (step === 4 && !f.technologies.length) return { technologies: "Add at least one technology." };
  if (step === 5) return validateSalary(f);
  return {};
}

export function validateAll(f: JobForm): Errs {
  return { ...validateInfo(f), ...validateStep(3, f), ...validateStep(4, f), ...validateSalary(f) };
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

export type JobAction = "publish" | "pause" | "resume" | "close";
export function allowedActions(s: JobStatus): JobAction[] {
  switch (s) {
    case "draft": return ["publish", "close"];
    case "active": return ["pause", "close"];
    case "paused": return ["resume", "close"];
    case "closed": return [];
  }
}
export function nextStatus(a: JobAction): JobStatus {
  return a === "pause" ? "paused" : a === "close" ? "closed" : "active";
}
export const canEdit = (s: JobStatus) => s !== "closed";
export const canDelete = (applicationCount: number) => applicationCount === 0;

import { supabase } from "@/integrations/supabase/client";

export const STAGES = ["saved", "contacted", "interviewing", "shortlisted", "offer", "hired", "rejected"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABELS: Record<Stage, string> = { saved: "Saved", contacted: "Contacted", interviewing: "Interviewing", shortlisted: "Shortlisted", offer: "Offer", hired: "Hired", rejected: "Not Moving Forward" };

export type CompanyJob = {
  job_id: string; job_title: string; job_status: string; recruiter_id: string; recruiter_name: string;
  created_at: string; published_at: string | null; applicants: number;
} & Record<Stage, number>;

/** Every job posted under the company (admins only). Counts only — no candidate details. */
export async function loadCompanyJobs(companyId: string): Promise<CompanyJob[]> {
  const { data, error } = await supabase.rpc("company_admin_jobs", { _company: companyId });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r, applicants: Number(r.applicants),
    ...Object.fromEntries(STAGES.map((s) => [s, Number(r[s])])),
  }) as CompanyJob);
}

export type CompanySummary = { totalJobs: number; activeJobs: number; draftJobs: number; closedJobs: number; applicants: number; inPipeline: number; hired: number; recruiters: number; stages: Record<Stage, number> };

export function summarizeCompany(jobs: CompanyJob[]): CompanySummary {
  const stages = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  for (const j of jobs) for (const s of STAGES) stages[s] += j[s];
  return {
    totalJobs: jobs.length,
    activeJobs: jobs.filter((j) => j.job_status === "active").length,
    draftJobs: jobs.filter((j) => j.job_status === "draft").length,
    closedJobs: jobs.filter((j) => j.job_status === "closed").length,
    applicants: jobs.reduce((n, j) => n + j.applicants, 0),
    inPipeline: STAGES.filter((s) => s !== "rejected").reduce((n, s) => n + stages[s], 0),
    hired: stages.hired,
    recruiters: new Set(jobs.map((j) => j.recruiter_id)).size,
    stages,
  };
}

export type JobFilter = { status: string; recruiter: string; q: string };
export function filterCompanyJobs(jobs: CompanyJob[], f: JobFilter): CompanyJob[] {
  const q = f.q.trim().toLowerCase();
  return jobs.filter((j) => (f.status === "all" || j.job_status === f.status) && (f.recruiter === "all" || j.recruiter_id === f.recruiter) && (!q || j.job_title.toLowerCase().includes(q)));
}

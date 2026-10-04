import { APP_STATUSES, STAGES } from "./talent-rules";

type App = { application_date: string; application_status: string; job_id: string };
type Pipe = { current_stage: string };
type Job = { job_id: string; job_status: string };

export function recruiterKpis(jobs: Job[], apps: App[], pipe: Pipe[]) {
  return {
    activeJobs: jobs.filter((j) => j.job_status === "active").length,
    applications: apps.length,
    inPipeline: pipe.filter((p) => p.current_stage !== "hired" && p.current_stage !== "rejected").length,
    interviewing: pipe.filter((p) => p.current_stage === "interviewing").length,
    offers: pipe.filter((p) => p.current_stage === "offer").length,
    hires: pipe.filter((p) => p.current_stage === "hired").length,
  };
}

export function jobStatusCounts(jobs: Job[]) {
  return (["draft", "active", "paused", "closed"] as const).map((s) => ({ key: s, n: jobs.filter((j) => j.job_status === s).length }));
}

export function stageCounts(pipe: Pipe[]) {
  return STAGES.map(([key, label]) => ({ key, label, n: pipe.filter((p) => p.current_stage === key).length }));
}

export function appStatusCounts(apps: App[]) {
  return APP_STATUSES.map(([key, label]) => ({ key, label, n: apps.filter((a) => a.application_status === key).length }));
}

/** Week = last 7 days; month = same calendar month (UTC). */
export function appWindows(apps: App[], now = new Date()) {
  const weekAgo = now.getTime() - 7 * 86400000;
  return {
    week: apps.filter((a) => new Date(a.application_date).getTime() >= weekAgo).length,
    month: apps.filter((a) => { const d = new Date(a.application_date); return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth(); }).length,
  };
}

export function countBy<T>(rows: T[], key: (r: T) => string) {
  const out: Record<string, number> = {};
  for (const r of rows) out[key(r)] = (out[key(r)] ?? 0) + 1;
  return out;
}

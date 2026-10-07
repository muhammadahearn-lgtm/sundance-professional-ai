import { confidentialName } from "./confidential";
import { supabase } from "@/integrations/supabase/client";
import type { CareerData } from "./career-data";
import type { MatchDetails } from "./match-engine";
import { listPipeline } from "./applications-data";
import { talentByIds } from "./talent-data";
import { recommendCandidates, recommendCerts, recommendGaps, recommendGrowth, recommendHiring, recommendJobs, recommendPipeline, type CandInput, type JobHealthInput } from "./recommend-engine";

const money = (n: number | null) => (n ? `$${Math.round(n / 1000)}k` : "");
const det = (d: unknown) => (d && typeof d === "object" && "missing" in d ? (d as MatchDetails) : null);

/** Candidate recommendations, built on top of the Career Intelligence report. */
export async function loadCandidateRecs(uid: string, career: CareerData) {
  const [sc, apps, saved] = await Promise.all([
    supabase.from("match_scores").select("job_id, overall_match_score, details, jobs!inner(job_title, location, job_status, minimum_salary, maximum_salary, is_confidential, confidential_label, companies(company_name))").eq("candidate_id", uid).eq("jobs.job_status", "active"),
    supabase.from("applications").select("job_id").eq("candidate_id", uid),
    supabase.from("saved_jobs").select("job_id").eq("candidate_id", uid),
  ]);
  const err = [sc, apps, saved].find((x) => x.error)?.error;
  if (err) throw err;
  const applied = new Set((apps.data ?? []).map((a) => a.job_id)), savedSet = new Set((saved.data ?? []).map((s) => s.job_id));
  const r = career.report;
  const jobs = recommendJobs((sc.data ?? []).map((s) => ({
    jobId: s.job_id, title: s.jobs.job_title, company: s.jobs.is_confidential ? confidentialName(s.jobs.confidential_label) : s.jobs.companies?.company_name ?? "", location: s.jobs.location,
    salary: [money(s.jobs.minimum_salary), money(s.jobs.maximum_salary)].filter(Boolean).join("–"), overall: Number(s.overall_match_score), details: det(s.details),
    saved: savedSet.has(s.job_id), applied: applied.has(s.job_id),
  })), r.readiness.score);
  const me = await supabase.from("certifications").select("certification_name").eq("candidate_id", uid);
  return {
    jobs, skills: recommendGaps([...r.skillGaps, ...r.langGaps]), technologies: recommendGaps(r.techGaps),
    certifications: recommendCerts((me.data ?? []).map((c) => c.certification_name), r.current.technologies, r.techGaps),
    growth: recommendGrowth(r.roadmap, r.salary), readiness: r.readiness.score,
  };
}
export type CandidateRecs = Awaited<ReturnType<typeof loadCandidateRecs>>;

/** Recruiter recommendations from their jobs, match scores, applications, pipeline and saved candidates. */
export async function loadRecruiterRecs(uid: string) {
  const jobsQ = await supabase.from("jobs").select("job_id, job_title, role_id, work_arrangement, location, minimum_years_experience, maximum_salary, job_description, job_status").eq("recruiter_id", uid).neq("job_status", "draft");
  if (jobsQ.error) throw jobsQ.error;
  const jobs = jobsQ.data ?? [];
  const active = jobs.filter((j) => j.job_status === "active");
  const ids = jobs.map((j) => j.job_id);
  const [sc, apps, saved, pipe, market] = await Promise.all([
    ids.length ? supabase.from("match_scores").select("candidate_id, job_id, overall_match_score, details").in("job_id", ids) : Promise.resolve({ data: [], error: null }),
    ids.length ? supabase.from("applications").select("candidate_id, job_id").in("job_id", ids) : Promise.resolve({ data: [], error: null }),
    supabase.from("saved_candidates").select("candidate_id").eq("recruiter_id", uid),
    listPipeline(uid),
    supabase.from("jobs").select("role_id, maximum_salary").eq("job_status", "active"),
  ]);
  const err = [sc, apps, saved, market].find((x) => x.error)?.error;
  if (err) throw err;
  const scores = sc.data ?? [];
  const candIds = [...new Set(scores.map((s) => s.candidate_id))];
  const talent = await talentByIds(candIds);
  const tMap = new Map(talent.map((t) => [t.id, t]));
  const applied = new Set((apps.data ?? []).map((a) => `${a.candidate_id}:${a.job_id}`));
  const inPipe = new Set(pipe.map((p) => `${p.candidate_id}:${p.job_id}`));
  const savedSet = new Set((saved.data ?? []).map((s) => s.candidate_id));
  const title = Object.fromEntries(jobs.map((j) => [j.job_id, j.job_title]));
  const activeIds = new Set(active.map((j) => j.job_id));

  const rows: CandInput[] = scores.filter((s) => activeIds.has(s.job_id) && tMap.has(s.candidate_id)).map((s) => {
    const t = tMap.get(s.candidate_id)!;
    return { candidateId: s.candidate_id, name: t.name, role: t.jobTitle, skills: t.skills, availability: t.availability, jobId: s.job_id, jobTitle: title[s.job_id] ?? "",
      overall: Number(s.overall_match_score), details: det(s.details), applied: applied.has(`${s.candidate_id}:${s.job_id}`), inPipeline: inPipe.has(`${s.candidate_id}:${s.job_id}`), saved: savedSet.has(s.candidate_id) };
  });
  const scoreOf = (c: string, j: string | null) => (j ? scores.find((s) => s.candidate_id === c && s.job_id === j) : undefined);

  const health: JobHealthInput[] = active.map((j) => {
    const peers = (market.data ?? []).filter((m) => m.role_id && m.role_id === j.role_id && m.maximum_salary).map((m) => m.maximum_salary!);
    return { jobId: j.job_id, title: j.job_title, arrangement: j.work_arrangement, location: j.location, minYears: j.minimum_years_experience, maxSalary: j.maximum_salary, descriptionLength: j.job_description.length,
      marketMaxSalary: peers.length ? peers.reduce((a, b) => a + b, 0) / peers.length : null,
      scores: scores.filter((s) => s.job_id === j.job_id).map((s) => ({ overall: Number(s.overall_match_score), experienceGap: det(s.details)?.experienceGap ?? 0 })) };
  });

  return {
    candidates: recommendCandidates(rows),
    pipeline: recommendPipeline(pipe.map((p) => ({ pipelineId: p.pipeline_id, candidateId: p.candidate_id, name: p.name, jobTitle: p.jobs?.job_title ?? "General", stage: p.current_stage, stageDate: p.stage_date, match: scoreOf(p.candidate_id, p.job_id) ? Number(scoreOf(p.candidate_id, p.job_id)!.overall_match_score) : null }))),
    appIdByPipeline: Object.fromEntries(pipe.map((p) => [p.pipeline_id, p.applicationId])) as Record<string, string | null>,
    hiring: recommendHiring(health),
    searches: active.filter((j) => j.role_id).map((j) => ({ jobId: j.job_id, title: j.job_title, roleId: j.role_id!, remote: j.work_arrangement === "remote" })),
  };
}
export type RecruiterRecs = Awaited<ReturnType<typeof loadRecruiterRecs>>;

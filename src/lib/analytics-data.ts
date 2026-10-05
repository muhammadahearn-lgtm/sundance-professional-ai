import { supabase } from "@/integrations/supabase/client";
import { namesFor } from "./talent-data";

export type JobInfo = {
  job_id: string; job_title: string; location: string; work_arrangement: string; job_status?: string | undefined;
  company: string; industry: string; role: string; skills: string[]; technologies: string[]; softSkills?: string[];
};

const JOB_SELECT = "job_id, job_title, location, work_arrangement, job_status, companies(company_name, industry), roles(role_name), job_skills(technical_skills(skill_name)), job_technologies(technologies(technology_name)), job_soft_skills(soft_skills(soft_skill_name))";

type RawJob = {
  job_id: string; job_title: string; location: string; work_arrangement: string; job_status: string;
  companies: { company_name: string; industry: string } | null; roles: { role_name: string } | null;
  job_skills: { technical_skills: { skill_name: string } | null }[]; job_technologies: { technologies: { technology_name: string } | null }[];
  job_soft_skills?: { soft_skills: { soft_skill_name: string } | null }[];
};
const toInfo = (j: RawJob): JobInfo => ({
  job_id: j.job_id, job_title: j.job_title, location: j.location, work_arrangement: j.work_arrangement, job_status: j.job_status,
  company: j.companies?.company_name ?? "", industry: j.companies?.industry ?? "", role: j.roles?.role_name ?? "",
  skills: j.job_skills.map((s) => s.technical_skills?.skill_name ?? "").filter(Boolean),
  technologies: j.job_technologies.map((t) => t.technologies?.technology_name ?? "").filter(Boolean),
  softSkills: (j.job_soft_skills ?? []).map((s) => s.soft_skills?.soft_skill_name ?? "").filter(Boolean),
});

async function jobsInfo(ids: string[]): Promise<Record<string, JobInfo>> {
  if (!ids.length) return {};
  const { data, error } = await supabase.from("jobs").select(JOB_SELECT).in("job_id", ids);
  if (error) throw error;
  return Object.fromEntries(((data ?? []) as unknown as RawJob[]).map((j) => [j.job_id, toInfo(j)]));
}

const must = <T,>(r: { data: T | null; error: unknown }): T => { if (r.error) throw r.error; return (r.data ?? []) as T; };

export async function loadCandidateAnalytics(uid: string) {
  const [apps, scores, snaps, skills, techs, certs, exp, saved, events, msgs, notifs] = await Promise.all([
    supabase.from("applications").select("application_id, job_id, application_date, application_status, updated_at").eq("candidate_id", uid),
    supabase.from("match_scores").select("job_id, overall_match_score, calculated_date").eq("candidate_id", uid),
    supabase.from("career_snapshots").select("snapshot_date, readiness_score, average_match, profile_completion, skill_count, technology_count").eq("candidate_id", uid).order("snapshot_date"),
    supabase.from("candidate_skills").select("created_at").eq("candidate_id", uid),
    supabase.from("candidate_technologies").select("created_at").eq("candidate_id", uid),
    supabase.from("certifications").select("created_at").eq("candidate_id", uid),
    supabase.from("work_experience").select("created_at").eq("candidate_id", uid),
    supabase.from("saved_jobs").select("job_id, saved_date").eq("candidate_id", uid),
    supabase.from("analytics_events").select("event_type, entity_id, created_at").eq("user_id", uid),
    supabase.from("messages").select("conversation_id, sender_id, created_at"),
    supabase.from("notifications").select("status, read_at, created_at, category").eq("recipient_id", uid),
  ]);
  const a = must(apps), s = must(scores), sv = must(saved), ev = must(events);
  const ids = [...new Set([...a.map((x) => x.job_id), ...s.map((x) => x.job_id), ...sv.map((x) => x.job_id), ...ev.filter((e) => e.event_type !== "candidate_view").map((e) => e.entity_id)])];
  return {
    apps: a, scores: s, snapshots: must(snaps), saved: sv, events: ev,
    skills: must(skills), technologies: must(techs), certifications: must(certs), experience: must(exp),
    messages: must(msgs), notifications: must(notifs), jobs: await jobsInfo(ids),
  };
}
export type CandidateAnalyticsData = Awaited<ReturnType<typeof loadCandidateAnalytics>>;

export async function loadRecruiterAnalytics(uid: string) {
  const jobsR = await supabase.from("jobs").select(JOB_SELECT + ", created_at, published_at").eq("recruiter_id", uid);
  const jobs = must(jobsR) as unknown as (RawJob & { created_at: string; published_at: string | null })[];
  const jobIds = jobs.map((j) => j.job_id);
  const none = Promise.resolve({ data: [], error: null });
  const [apps, pipe, scores, views, events, msgs, notifs, savedC] = await Promise.all([
    jobIds.length ? supabase.from("applications").select("application_id, candidate_id, job_id, application_date, application_status").in("job_id", jobIds) : none,
    supabase.from("recruiting_pipeline").select("candidate_id, job_id, current_stage, stage_date, created_at").eq("recruiter_id", uid),
    jobIds.length ? supabase.from("match_scores").select("candidate_id, job_id, overall_match_score").in("job_id", jobIds) : none,
    supabase.rpc("my_job_view_counts"),
    supabase.from("analytics_events").select("event_type, entity_id, created_at").eq("user_id", uid),
    supabase.from("messages").select("conversation_id, sender_id, created_at"),
    supabase.from("notifications").select("status, read_at, created_at, category").eq("recipient_id", uid),
    supabase.from("saved_candidates").select("candidate_id, saved_date").eq("recruiter_id", uid),
  ]);
  type App = { application_id: string; candidate_id: string; job_id: string; application_date: string; application_status: string };
  type Pipe = { candidate_id: string; job_id: string | null; current_stage: string; stage_date: string; created_at: string };
  type Score = { candidate_id: string; job_id: string; overall_match_score: number };
  const a = must(apps) as App[], p = must(pipe) as Pipe[], sc = must(scores) as Score[];
  const candIds = [...new Set([...a.map((x) => x.candidate_id), ...p.map((x) => x.candidate_id)])];
  const [names, profs, cskills, csoft] = candIds.length ? await Promise.all([
    namesFor([...new Set([...candIds, ...sc.map((x) => x.candidate_id)])]),
    supabase.from("candidate_profiles").select("user_id, availability, years_experience, job_title").in("user_id", candIds),
    supabase.from("candidate_skills").select("candidate_id, technical_skills(skill_name)").in("candidate_id", candIds),
    supabase.from("candidate_soft_skills").select("candidate_id, soft_skills(soft_skill_name)").in("candidate_id", candIds),
  ]) : [await namesFor([...new Set(sc.map((x) => x.candidate_id))]), { data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  const { data: convs } = await supabase.rpc("my_conversations");
  return {
    jobs: jobs.map((j) => ({ ...toInfo(j), created_at: j.created_at })),
    apps: a, pipeline: p, scores: sc, saved: must(savedC), events: must(events),
    views: (must(views) as { job_id: string; views: number; viewers: number }[]),
    messages: must(msgs), notifications: must(notifs),
    names: names as Record<string, string>,
    profiles: must(profs) as { user_id: string; availability: string; years_experience: number; job_title: string }[],
    candidateSkills: (must(cskills) as unknown as { candidate_id: string; technical_skills: { skill_name: string } | null }[]),
    candidateSoftSkills: (must(csoft) as unknown as { candidate_id: string; soft_skills: { soft_skill_name: string } | null }[]),
    contacted: [...new Set(((convs ?? []) as { candidate_id: string }[]).map((c) => c.candidate_id))],
  };
}
export type RecruiterAnalyticsData = Awaited<ReturnType<typeof loadRecruiterAnalytics>>;

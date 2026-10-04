import { supabase } from "@/integrations/supabase/client";
import { namesFor } from "./talent-data";
import { stageToStatus, type AppStatus, type Stage } from "./talent-rules";

const JOB = "job_id, job_title, location, work_arrangement, job_status, role_id, companies(company_name, logo_url)";

export async function myApplicationFor(uid: string, jobId: string) {
  const { data, error } = await supabase.from("applications").select("application_id, application_status, application_date").eq("candidate_id", uid).eq("job_id", jobId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function applyToJob(uid: string, jobId: string) {
  const { data, error } = await supabase.from("applications").insert({ candidate_id: uid, job_id: jobId, application_status: "applied" }).select("application_id, application_date, application_status").single();
  if (error) {
    if (error.code === "23505") throw new Error("Already Applied");
    if (error.code === "42501") throw new Error("This job is no longer accepting applications.");
    throw error;
  }
  return data;
}

export async function listMyApplications(uid: string) {
  const { data, error } = await supabase.from("applications").select(`application_id, application_date, application_status, updated_at, jobs(${JOB})`).eq("candidate_id", uid).order("application_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function loadMyApplication(id: string) {
  const { data, error } = await supabase.from("applications").select(`application_id, application_date, application_status, updated_at, job_id, jobs(${JOB})`).eq("application_id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function withdrawApplication(id: string) {
  const { error } = await supabase.from("applications").delete().eq("application_id", id);
  if (error) throw error;
}

/** Recruiter: applications to own jobs, with candidate summary data. */
export async function listJobApplications(uid: string) {
  const { data, error } = await supabase.from("applications").select(`application_id, application_date, application_status, candidate_id, job_id, jobs!inner(job_id, job_title, location, role_id, recruiter_id)`).eq("jobs.recruiter_id", uid).order("application_date", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.candidate_id))];
  if (!ids.length) return [];
  const [names, profs, skills, techs] = await Promise.all([
    namesFor(ids),
    supabase.from("candidate_profiles").select("user_id, job_title, years_experience, availability, location").in("user_id", ids),
    supabase.from("candidate_skills").select("candidate_id, lookup_id").in("candidate_id", ids),
    supabase.from("candidate_technologies").select("candidate_id, lookup_id").in("candidate_id", ids),
  ]);
  const err = [profs, skills, techs].find((x) => x.error)?.error;
  if (err) throw err;
  return rows.map((r) => {
    const p = profs.data?.find((x) => x.user_id === r.candidate_id);
    return {
      ...r, name: names[r.candidate_id] ?? "Candidate", candTitle: p?.job_title ?? "", years: p?.years_experience ?? 0, availability: p?.availability ?? "", candLocation: p?.location ?? "",
      skills: (skills.data ?? []).filter((x) => x.candidate_id === r.candidate_id).map((x) => x.lookup_id),
      techs: (techs.data ?? []).filter((x) => x.candidate_id === r.candidate_id).map((x) => x.lookup_id),
    };
  });
}
export type JobApplication = Awaited<ReturnType<typeof listJobApplications>>[number];

export async function loadJobApplication(id: string) {
  const { data, error } = await supabase.from("applications").select("application_id, application_date, application_status, candidate_id, job_id, jobs(job_id, job_title, recruiter_id)").eq("application_id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function setApplicationStatus(id: string, status: AppStatus) {
  const { error } = await supabase.from("applications").update({ application_status: status }).eq("application_id", id);
  if (error) throw error;
}

/** Mark as viewed the first time a recruiter opens a fresh application. */
export async function markViewed(id: string, current: string) {
  if (current === "applied") await setApplicationStatus(id, "viewed");
}

// ---------- Pipeline ----------
export async function listPipeline(uid: string, jobId?: string) {
  let q = supabase.from("recruiting_pipeline").select("pipeline_id, candidate_id, job_id, current_stage, stage_date, created_at, jobs(job_title)").eq("recruiter_id", uid).order("stage_date", { ascending: false });
  if (jobId) q = q.eq("job_id", jobId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.candidate_id))];
  if (!ids.length) return [];
  const [names, profs, skills, apps] = await Promise.all([
    namesFor(ids),
    supabase.from("candidate_profiles").select("user_id, job_title, years_experience").in("user_id", ids),
    supabase.from("candidate_skills").select("candidate_id, lookup_id").in("candidate_id", ids),
    supabase.from("applications").select("candidate_id, job_id, application_date, application_id").in("candidate_id", ids),
  ]);
  return rows.map((r) => {
    const p = profs.data?.find((x) => x.user_id === r.candidate_id);
    const app = apps.data?.find((a) => a.candidate_id === r.candidate_id && a.job_id === r.job_id);
    return { ...r, name: names[r.candidate_id] ?? "Candidate", candTitle: p?.job_title ?? "", years: p?.years_experience ?? 0, appDate: app?.application_date ?? null, applicationId: app?.application_id ?? null, skills: (skills.data ?? []).filter((x) => x.candidate_id === r.candidate_id).map((x) => x.lookup_id) };
  });
}
export type PipelineCard = Awaited<ReturnType<typeof listPipeline>>[number];

export async function addToPipeline(uid: string, candidateId: string, jobId: string | null, stage: Stage = "saved") {
  const { error } = await supabase.from("recruiting_pipeline").insert({ recruiter_id: uid, candidate_id: candidateId, job_id: jobId, current_stage: stage });
  if (error && error.code !== "23505") throw error;
  if (error?.code === "23505") throw new Error("Candidate is already in this pipeline.");
}

/** Move a card and keep the linked application status in sync. */
export async function moveStage(card: Pick<PipelineCard, "pipeline_id" | "applicationId">, stage: Stage) {
  const { error } = await supabase.from("recruiting_pipeline").update({ current_stage: stage }).eq("pipeline_id", card.pipeline_id);
  if (error) throw error;
  const st = stageToStatus(stage);
  if (st && card.applicationId) await setApplicationStatus(card.applicationId, st);
}

export async function removeFromPipeline(id: string) {
  const { error } = await supabase.from("recruiting_pipeline").delete().eq("pipeline_id", id);
  if (error) throw error;
}

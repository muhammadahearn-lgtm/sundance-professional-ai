import { supabase } from "@/integrations/supabase/client";
import { maskJobRow } from "./confidential";
import { namesFor } from "./talent-data";
import { sendActivityEmail } from "./activity-email.functions";
import { notifyHiringTeam } from "./hiring-team.functions";
import { stageToStatus, type AppStatus, type Stage } from "./talent-rules";

const JOB = "job_id, job_title, location, work_arrangement, job_status, role_id, is_confidential, confidential_label, companies(company_name, logo_url)";

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
  notifyByEmail("application", data.application_id);
  return data;
}

/** Email the other person about this event; never blocks or breaks the action. */
export function notifyByEmail(kind: "application" | "message", id: string) {
  void sendActivityEmail({ data: { kind, id } }).catch(() => {});
}

export async function listMyApplications(uid: string) {
  const { data, error } = await supabase.from("applications").select(`application_id, application_date, application_status, updated_at, job_id, jobs(${JOB})`).eq("candidate_id", uid).order("application_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((a) => ({ ...a, jobs: a.jobs ? maskJobRow(a.jobs) : a.jobs }));
}

export async function loadMyApplication(id: string) {
  const { data, error } = await supabase.from("applications").select(`application_id, application_date, application_status, updated_at, job_id, withdrawn_at, withdraw_reason, jobs(${JOB})`).eq("application_id", id).maybeSingle();
  if (error) throw error;
  return data && data.jobs ? { ...data, jobs: maskJobRow(data.jobs) } : data;
}

/** Candidate steps down with a reason; the DB closes offers, interviews and the pipeline card and alerts the recruiter. */
export async function withdrawApplication(id: string, reason: string, note = "") {
  const { error } = await supabase.rpc("withdraw_application", { _application: id, _reason: reason, _note: note });
  if (error) throw error;
}

/** Upload a resume from the Apply dialog and attach it to the candidate profile. */
export async function uploadResumeForApply(uid: string, file: File, oldPath: string | null) {
  const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
  const path = `${uid}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from("resumes").upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (error) throw error;
  const { error: e2 } = await supabase.from("candidate_profiles").update({ resume_path: path, resume_file_name: file.name, resume_uploaded_at: new Date().toISOString() }).eq("user_id", uid);
  if (e2) { await supabase.storage.from("resumes").remove([path]); throw e2; }
  if (oldPath) await supabase.storage.from("resumes").remove([oldPath]);
  return path;
}

/** Send the optional intro note as the first message to the hiring team. */
export async function sendIntroNote(uid: string, jobId: string, body: string) {
  const { data, error } = await supabase.rpc("start_conversation", { _candidate: uid, _job: jobId });
  if (error || !data) throw error ?? new Error("Unable to start conversation");
  const { error: e2 } = await supabase.from("messages").insert({ conversation_id: data, sender_id: uid, sender_type: "candidate", message_body: body });
  if (e2) throw e2;
}

/** Pending offers for the signed-in candidate (application ids). */
export async function myPendingOfferApps(uid: string) {
  const { data, error } = await supabase.from("job_offers").select("application_id").eq("candidate_id", uid).eq("status", "pending");
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.application_id));
}

/** Recruiter: applications to own jobs, with candidate summary data. */
export async function listJobApplications(uid: string) {
  const { data, error } = await supabase.from("applications").select(`application_id, application_date, application_status, candidate_id, job_id, jobs!inner(job_id, job_title, job_status, location, role_id, recruiter_id, company_id, companies(company_name))`).eq("jobs.recruiter_id", uid).order("application_date", { ascending: false });
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
  notifyByEmail("application", id);
}

/** Mark as viewed the first time a recruiter opens a fresh application. */
export async function markViewed(id: string, current: string) {
  if (current === "applied") await setApplicationStatus(id, "viewed");
}

// ---------- Pipeline ----------
export async function listPipeline(uid: string, jobId?: string) {
  let q = supabase.from("recruiting_pipeline").select("pipeline_id, candidate_id, job_id, current_stage, stage_date, created_at, jobs(job_title, interview_plan, job_status)").eq("recruiter_id", uid).order("stage_date", { ascending: false });
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
    supabase.from("applications").select("candidate_id, job_id, application_date, application_id, withdrawn_at, withdraw_reason, reneged_at, renege_reason, rejection_deliver_at, rejection_notified_at, rejection_prev_stage").in("candidate_id", ids),
  ]);
  return rows.map((r) => {
    const p = profs.data?.find((x) => x.user_id === r.candidate_id);
    const app = apps.data?.find((a) => a.candidate_id === r.candidate_id && a.job_id === r.job_id);
    return { ...r, name: names[r.candidate_id] ?? "Candidate", candTitle: p?.job_title ?? "", years: p?.years_experience ?? 0, appDate: app?.application_date ?? null, applicationId: app?.application_id ?? null, withdrawnAt: app?.withdrawn_at ?? null, withdrawReason: app?.withdraw_reason ?? "", renegedAt: app?.reneged_at ?? null, renegeReason: app?.renege_reason ?? "", rejectionDeliverAt: app?.rejection_deliver_at ?? null, rejectionNotifiedAt: app?.rejection_notified_at ?? null, rejectionPrevStage: app?.rejection_prev_stage ?? null, skills: (skills.data ?? []).filter((x) => x.candidate_id === r.candidate_id).map((x) => x.lookup_id) };
  });
}
export type PipelineCard = Awaited<ReturnType<typeof listPipeline>>[number];

export async function addToPipeline(uid: string, candidateId: string, jobId: string | null, stage: Stage = "contacted") {
  const { error } = await supabase.from("recruiting_pipeline").insert({ recruiter_id: uid, candidate_id: candidateId, job_id: jobId, current_stage: stage });
  if (error && error.code !== "23505") throw error;
  if (error?.code === "23505") throw new Error("Candidate is already in this pipeline.");
}

/** Move a card and keep the linked application status in sync. */
export async function moveStage(card: Pick<PipelineCard, "pipeline_id" | "applicationId">, stage: Stage) {
  const { data: row, error } = await supabase.from("recruiting_pipeline").update({ current_stage: stage }).eq("pipeline_id", card.pipeline_id).select("job_id, candidate_id").maybeSingle();
  if (error) throw error;
  const st = stageToStatus(stage);
  if (st && card.applicationId) await setApplicationStatus(card.applicationId, st);
  if (row?.job_id && (stage === "shortlisted" || stage === "offer" || stage === "hired")) {
    void notifyHiringTeam({ data: { kind: "stage", jobId: row.job_id, candidateId: row.candidate_id, stage } }).catch(() => {});
  }
}


// ---------- Screening ----------
export async function loadScreeningQuestions(jobId: string): Promise<import("./screening").ScreeningQ[]> {
  const { data, error } = await supabase.from("job_screening_questions").select("*").eq("job_id", jobId).order("sort_order");
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.question_id, text: r.question_text, type: r.question_type as "yes_no" | "choice" | "text", options: r.options, ideal: r.ideal_answer, required: r.is_required, knockout: r.is_knockout }));
}
export async function saveScreeningAnswers(applicationId: string, answers: Record<string, string>) {
  const rows = Object.entries(answers).filter(([, a]) => a.trim()).map(([question_id, a]) => ({ application_id: applicationId, question_id, answer_text: a.trim().slice(0, 1000) }));
  if (!rows.length) return;
  const { error } = await supabase.from("application_screening_answers").insert(rows);
  if (error) throw error;
}
/** Questions with this application's answers (candidate or job owner only, via RLS). */
export async function loadScreeningAnswers(applicationId: string, jobId: string) {
  const [qs, a] = await Promise.all([loadScreeningQuestions(jobId), supabase.from("application_screening_answers").select("question_id, answer_text").eq("application_id", applicationId)]);
  if (a.error) throw a.error;
  const map = Object.fromEntries((a.data ?? []).map((r) => [r.question_id, r.answer_text]));
  return qs.map((q) => ({ q, answer: map[q.id] ?? "" }));
}

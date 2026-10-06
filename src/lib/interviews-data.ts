import { supabase } from "@/integrations/supabase/client";
import type { InterviewDraft, ScorecardDraft } from "./interview-rules";

export type Interview = {
  interview_id: string; pipeline_id: string | null; application_id: string | null; recruiter_id: string; candidate_id: string; job_id: string | null;
  format: string; interview_type: string; custom_round_name: string; round_number: number; platform: string; meeting_url: string; location_address: string; location_instructions: string;
  scheduled_at: string; duration_minutes: number; timezone: string; notes: string; status: string;
};

export async function listRecruiterInterviews(uid: string): Promise<Interview[]> {
  const { data, error } = await supabase.from("interviews").select("*").eq("recruiter_id", uid).neq("status", "cancelled").order("scheduled_at");
  if (error) throw error;
  return (data ?? []) as Interview[];
}

export async function listApplicationInterviews(applicationId: string): Promise<Interview[]> {
  const { data, error } = await supabase.from("interviews").select("*").eq("application_id", applicationId).neq("status", "cancelled").order("scheduled_at");
  if (error) throw error;
  return (data ?? []) as Interview[];
}

export async function saveInterview(ctx: { uid: string; candidateId: string; jobId: string | null; pipelineId: string | null; applicationId: string | null; interviewId?: string }, d: InterviewDraft) {
  const row = {
    recruiter_id: ctx.uid, candidate_id: ctx.candidateId, job_id: ctx.jobId, pipeline_id: ctx.pipelineId, application_id: ctx.applicationId,
    format: d.format, interview_type: d.interview_type, custom_round_name: d.interview_type === "custom" ? (d.custom_round_name ?? "").trim() : "", round_number: d.round_number, platform: d.format === "online" ? d.platform : "",
    meeting_url: d.format === "online" ? d.meeting_url.trim() : "", location_address: d.format === "in_person" ? d.location_address.trim() : "",
    location_instructions: d.format === "in_person" ? d.location_instructions.trim() : "",
    scheduled_at: new Date(`${d.date}T${d.time}`).toISOString(), duration_minutes: d.duration_minutes, timezone: d.timezone, notes: d.notes.trim(),
  };
  const res = ctx.interviewId ? await supabase.from("interviews").update(row).eq("interview_id", ctx.interviewId) : await supabase.from("interviews").insert(row);
  if (res.error) throw res.error;
}

export async function cancelInterview(id: string) {
  const { error } = await supabase.from("interviews").update({ status: "cancelled" }).eq("interview_id", id);
  if (error) throw error;
}

export type InterviewRow = Interview & { job_title: string; company_id: string | null; company_name: string; candidate_name: string };

/** All interviews for the signed-in user (either role), with job, company and candidate names. */
export async function listMyInterviews(uid: string, role: "candidate" | "recruiter"): Promise<InterviewRow[]> {
  const { data, error } = await supabase.from("interviews").select("*, jobs(job_title, company_id, companies(company_name))")
    .eq(role === "candidate" ? "candidate_id" : "recruiter_id", uid).neq("status", "cancelled").order("scheduled_at");
  if (error) throw error;
  const rows = (data ?? []) as unknown as (Interview & { jobs: { job_title: string; company_id: string | null; companies: { company_name: string } | null } | null })[];
  let names = new Map<string, string>();
  if (role === "recruiter" && rows.length) {
    const { data: n } = await supabase.rpc("candidate_names", { _ids: [...new Set(rows.map((r) => r.candidate_id))] });
    names = new Map((n ?? []).map((x: { user_id: string; first_name: string; last_name: string }) => [x.user_id, `${x.first_name} ${x.last_name}`.trim()]));
  }
  return rows.map(({ jobs, ...r }) => ({ ...r, job_title: jobs?.job_title ?? "Interview", company_id: jobs?.company_id ?? null, company_name: jobs?.companies?.company_name ?? "", candidate_name: names.get(r.candidate_id) ?? "Candidate" }));
}

export type Scorecard = ScorecardDraft & { interview_id: string; recruiter_id: string; updated_at: string };

/** Private scorecards (recruiter-only; candidates can never read them). */
export async function listMyScorecards(uid: string): Promise<Scorecard[]> {
  const { data, error } = await supabase.from("interview_scorecards").select("*").eq("recruiter_id", uid);
  if (error) throw error;
  return (data ?? []) as Scorecard[];
}

export async function saveScorecard(uid: string, interviewId: string, d: ScorecardDraft) {
  const { error } = await supabase.from("interview_scorecards").upsert({ interview_id: interviewId, recruiter_id: uid, recommendation: d.recommendation, rating: d.rating, strengths: d.strengths.trim(), concerns: d.concerns.trim(), notes: d.notes.trim() });
  if (error) throw error;
}

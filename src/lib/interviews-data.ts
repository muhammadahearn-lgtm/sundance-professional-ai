import { supabase } from "@/integrations/supabase/client";
import type { InterviewDraft } from "./interview-rules";

export type Interview = {
  interview_id: string; pipeline_id: string | null; application_id: string | null; recruiter_id: string; candidate_id: string; job_id: string | null;
  format: string; interview_type: string; platform: string; meeting_url: string; location_address: string; location_instructions: string;
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

export async function saveInterview(ctx: { uid: string; candidateId: string; jobId: string | null; pipelineId: string; applicationId: string | null; interviewId?: string }, d: InterviewDraft) {
  const row = {
    recruiter_id: ctx.uid, candidate_id: ctx.candidateId, job_id: ctx.jobId, pipeline_id: ctx.pipelineId, application_id: ctx.applicationId,
    format: d.format, interview_type: d.interview_type, platform: d.format === "online" ? d.platform : "",
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

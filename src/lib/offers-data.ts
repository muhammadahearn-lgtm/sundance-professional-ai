import { supabase } from "@/integrations/supabase/client";
import { toOfferRow, type OfferForm } from "./offer-rules";

export type Offer = {
  offer_id: string; application_id: string | null; job_id: string; candidate_id: string; recruiter_id: string;
  salary_amount: number | null; salary_currency: string; signing_bonus: number | null; equity_details: string;
  start_date: string | null; expires_on: string | null; notes: string; status: string; revision: number;
  decline_reason: string; responded_at: string | null; negotiated_at: string | null; negotiation_conversation_id: string | null; created_at: string; updated_at: string;
};

/** Latest offer for a candidate on a job (any status). */
export async function latestOffer(jobId: string, candidateId: string): Promise<Offer | null> {
  const { data, error } = await supabase.from("job_offers").select("*").eq("job_id", jobId).eq("candidate_id", candidateId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data as Offer | null;
}

export async function offersForApplication(applicationId: string): Promise<Offer | null> {
  const { data, error } = await supabase.from("job_offers").select("*").eq("application_id", applicationId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data as Offer | null;
}

export async function sendOffer(ctx: { uid: string; jobId: string; candidateId: string; applicationId: string | null }, f: OfferForm) {
  const { error } = await supabase.from("job_offers").insert({ ...toOfferRow(f), recruiter_id: ctx.uid, job_id: ctx.jobId, candidate_id: ctx.candidateId, application_id: ctx.applicationId });
  if (error) throw error.code === "23505" ? new Error("This candidate already has an open offer. Revise it instead.") : error;
}

export async function reviseOffer(offerId: string, f: OfferForm) {
  const { error } = await supabase.from("job_offers").update(toOfferRow(f)).eq("offer_id", offerId);
  if (error) throw error;
}

export async function withdrawOffer(offerId: string) {
  const { error } = await supabase.from("job_offers").update({ status: "withdrawn" }).eq("offer_id", offerId);
  if (error) throw error;
}

export async function respondToOffer(offerId: string, accept: boolean, reason = "") {
  const { error } = await supabase.rpc("respond_to_offer", { _offer: offerId, _accept: accept, _reason: reason });
  if (error) throw error;
}

/** Start (or reuse) the conversation for this job and send an opening message. Returns the conversation id. */
export async function openNegotiation(uid: string, candidateId: string, jobId: string, body: string) {
  const { data, error } = await supabase.rpc("start_conversation", { _candidate: candidateId, _job: jobId });
  if (error || !data) throw error ?? new Error("Unable to start conversation");
  const { error: e2 } = await supabase.from("messages").insert({ conversation_id: data, sender_id: uid, sender_type: "candidate", message_body: body });
  if (e2) throw e2;
  return data as string;
}

/** Candidate opens a discussion on a pending offer: posts the message, flags the offer, notifies the recruiter. */
export async function requestNegotiation(offerId: string, body: string) {
  const { data, error } = await supabase.rpc("request_offer_negotiation", { _offer: offerId, _message: body });
  if (error || !data) throw error ?? new Error("Unable to start conversation");
  return data as string;
}

/** After a hire: mark every other open applicant and pipeline card for the job as Not Moving Forward. */
export async function wrapUpOthers(jobId: string, hiredCandidateId: string) {
  const open = ["applied", "viewed", "recruiter_contacted", "interviewing", "offer"] as const;
  const { data: closed, error } = await supabase.from("applications").update({ application_status: "rejected" }).eq("job_id", jobId).neq("candidate_id", hiredCandidateId).in("application_status", open as unknown as ("applied")[]).select("application_id");
  if (error) throw error;
  const { error: e2 } = await supabase.from("recruiting_pipeline").update({ current_stage: "rejected" }).eq("job_id", jobId).neq("candidate_id", hiredCandidateId).not("current_stage", "in", "(hired,rejected)");
  if (e2) throw e2;
  await supabase.from("job_offers").update({ status: "withdrawn" }).eq("job_id", jobId).neq("candidate_id", hiredCandidateId).eq("status", "pending");
  return (closed ?? []).map((r) => r.application_id);
}

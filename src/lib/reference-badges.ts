import { supabase } from "@/integrations/supabase/client";

/** Reference progress per (job, candidate) for the recruiter's own jobs (RLS-scoped). */
export async function listReferenceBadges() {
  const { data: reqs } = await supabase.from("reference_requests").select("request_id, job_id, candidate_id, target_count, status").neq("status", "cancelled");
  if (!reqs?.length) return [];
  const { data: refs } = await supabase.from("candidate_references").select("request_id, status").in("request_id", reqs.map((r) => r.request_id));
  return reqs.map((r) => ({
    job_id: r.job_id, candidate_id: r.candidate_id, target: r.target_count, status: r.status,
    done: (refs ?? []).filter((x) => x.request_id === r.request_id && x.status === "completed").length,
  }));
}

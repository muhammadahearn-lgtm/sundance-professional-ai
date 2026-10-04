import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Recalculate match scores for the caller.
 * Candidate → self vs every active job. Recruiter → their jobs (or one job) vs candidates they may see.
 */
export const recalculateMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { jobId?: string | undefined } | undefined) => ({ jobId: typeof input?.jobId === "string" ? input.jobId : undefined }))
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle();
    const role = roleRow?.role;
    if (role !== "candidate" && role !== "recruiter") throw new Error("Access denied");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recalcPairs } = await import("./match.server");

    if (role === "candidate") {
      const jobs = await supabaseAdmin.from("jobs").select("job_id").eq("job_status", "active");
      if (jobs.error) throw new Error(jobs.error.message);
      const count = await recalcPairs(supabaseAdmin, [context.userId], (jobs.data ?? []).map((j) => j.job_id));
      return { count };
    }

    let q = supabaseAdmin.from("jobs").select("job_id").eq("recruiter_id", context.userId).neq("job_status", "draft");
    if (data.jobId) q = q.eq("job_id", data.jobId);
    const jobs = await q;
    if (jobs.error) throw new Error(jobs.error.message);
    const jobIds = (jobs.data ?? []).map((j) => j.job_id);
    if (!jobIds.length) return { count: 0 };
    const [visible, applicants] = await Promise.all([
      supabaseAdmin.from("candidate_profiles").select("user_id").in("visibility_status", ["public", "recruiter_searchable"]),
      supabaseAdmin.from("applications").select("candidate_id").in("job_id", jobIds),
    ]);
    if (visible.error) throw new Error(visible.error.message);
    if (applicants.error) throw new Error(applicants.error.message);
    const ids = [...new Set([...(visible.data ?? []).map((r) => r.user_id), ...(applicants.data ?? []).map((r) => r.candidate_id)])];
    const count = await recalcPairs(supabaseAdmin, ids, jobIds);
    return { count };
  });

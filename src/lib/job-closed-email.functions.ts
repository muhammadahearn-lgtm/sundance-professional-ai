import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Recruiter wrapped up a filled job: email each listed applicant once.
 * Every application is re-checked as the caller (must be their own closed job).
 */
export const notifyApplicantsJobFilled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid(), applicationIds: z.array(z.string().uuid()).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: job } = await context.supabase.from("jobs").select("recruiter_id, job_status").eq("job_id", data.jobId).maybeSingle();
    if (!job || job.recruiter_id !== context.userId || job.job_status !== "closed") return { sent: 0 };
    const { data: apps } = await context.supabase.from("applications").select("application_id").eq("job_id", data.jobId).eq("application_status", "rejected").in("application_id", data.applicationIds);
    const { sendJobClosedNotice } = await import("./job-closed-email.server");
    let sent = 0;
    for (const a of apps ?? []) {
      try { if (await sendJobClosedNotice(a.application_id)) sent++; } catch (e) { console.error("job closed email failed", e); }
    }
    return { sent };
  });

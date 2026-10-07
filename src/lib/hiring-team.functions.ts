import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE = "https://sundanceprofessionals.com";
const STAGE_LABEL: Record<string, string> = { shortlisted: "Shortlisted", offer: "Offer", hired: "Hired" };

const input = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("stage"), jobId: z.string().uuid(), candidateId: z.string().uuid(), stage: z.enum(["shortlisted", "offer", "hired"]) }),
  z.object({ kind: z.literal("interview"), jobId: z.string().uuid(), candidateId: z.string().uuid() }),
]);

/**
 * Email the job's hiring team (people without accounts) about pipeline progress.
 * Only the job's posting recruiter can trigger it; never blocks the action.
 */
export const notifyHiringTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const { data: job } = await supabaseAdmin.from("jobs").select("job_title, recruiter_id").eq("job_id", data.jobId).maybeSingle();
    if (!job || job.recruiter_id !== context.userId) return { sent: 0 };

    const flag = data.kind === "stage" ? "notify_on_shortlist" : "notify_on_interview";
    const { data: team } = await supabaseAdmin.from("job_stakeholders").select("stakeholder_id, name, email").eq("job_id", data.jobId).eq(flag, true);
    if (!team?.length) return { sent: 0 };

    const { data: p } = await supabaseAdmin.from("profiles").select("first_name, last_name").eq("user_id", data.candidateId).maybeSingle();
    const cand = [p?.first_name, p?.last_name?.charAt(0) ? `${p.last_name.charAt(0)}.` : ""].filter(Boolean).join(" ") || "A candidate";

    let title: string, message: string, key: string;
    if (data.kind === "stage") {
      title = `${cand} moved to ${STAGE_LABEL[data.stage]} — ${job.job_title}`;
      message = `${cand} has reached the ${STAGE_LABEL[data.stage]} stage for ${job.job_title}. Your recruiter will follow up with next steps.`;
      key = `team-stage-${data.jobId}-${data.candidateId}-${data.stage}`;
    } else {
      const { data: iv } = await supabaseAdmin.from("interviews").select("interview_id, scheduled_at, duration_minutes, timezone, format, meeting_url, location_address, updated_at")
        .eq("job_id", data.jobId).eq("candidate_id", data.candidateId).neq("status", "cancelled").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (!iv) return { sent: 0 };
      const when = new Date(iv.scheduled_at).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short", timeZone: iv.timezone || "UTC" });
      const where = iv.format === "online" ? (iv.meeting_url ? `Online: ${iv.meeting_url}` : "Online") : `In person: ${iv.location_address}`;
      title = `Interview scheduled with ${cand} — ${job.job_title}`;
      message = `${when} (${iv.timezone}), ${iv.duration_minutes} minutes. ${where}.`;
      key = `team-interview-${iv.interview_id}-${iv.updated_at}`;
    }

    let sent = 0;
    for (const s of team) {
      try {
        const r = await sendTemplateEmail("activity-alert", s.email, {
          templateData: { title, message: `Hi ${s.name}, ${message}`, actionUrl: SITE, actionLabel: "About Sundance Professionals" },
          idempotencyKey: `${key}-${s.stakeholder_id}`,
        });
        if (r.sent) sent++;
      } catch (e) { console.error("hiring team email failed", e); }
    }
    return { sent };
  });

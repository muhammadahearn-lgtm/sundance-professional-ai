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

    // The candidate must actually be connected to this job (applied or in
    // the pipeline) before we read their name or email the hiring team.
    const [{ data: app }, { data: pipe }] = await Promise.all([
      supabaseAdmin.from("applications").select("application_id").eq("job_id", data.jobId).eq("candidate_id", data.candidateId).maybeSingle(),
      supabaseAdmin.from("recruiting_pipeline").select("pipeline_id").eq("job_id", data.jobId).eq("candidate_id", data.candidateId).maybeSingle(),
    ]);
    if (!app && !pipe) return { sent: 0 };

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

const shareInput = z.object({ jobId: z.string().uuid(), candidateIds: z.array(z.string().uuid()).min(2).max(4) });

/**
 * Email the job's hiring team a privacy-safe comparison (first name + last
 * initial, role, experience, match score, strengths). Built server-side from
 * the database — never from client text — and only for candidates the
 * posting recruiter is allowed to see.
 */
export const shareCompareWithTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => shareInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const { buildCompareSummary, shortName } = await import("./compare-share");
    const { data: job } = await supabaseAdmin.from("jobs").select("job_title, recruiter_id").eq("job_id", data.jobId).maybeSingle();
    if (!job || job.recruiter_id !== context.userId) throw new Error("Only the recruiter who posted this job can share it.");
    for (const id of data.candidateIds) {
      const { data: ok } = await context.supabase.rpc("recruiter_can_view_candidate", { _candidate: id });
      if (!ok) throw new Error("One of these candidates is not visible to you.");
    }
    const { data: team } = await supabaseAdmin.from("job_stakeholders").select("stakeholder_id, name, email").eq("job_id", data.jobId);
    if (!team?.length) return { sent: 0, team: 0 };
    const [{ data: profs }, { data: cps }, { data: scores }] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id, first_name, last_name").in("user_id", data.candidateIds),
      supabaseAdmin.from("candidate_profiles").select("user_id, job_title, years_experience").in("user_id", data.candidateIds),
      supabaseAdmin.from("match_scores").select("candidate_id, overall_match_score, details").eq("job_id", data.jobId).in("candidate_id", data.candidateIds),
    ]);
    const list = data.candidateIds.map((id) => {
      const p = profs?.find((x) => x.user_id === id);
      const s = scores?.find((x) => x.candidate_id === id);
      const det = (s?.details ?? {}) as { strengths?: string[] };
      return { firstName: p?.first_name ?? "", lastName: p?.last_name ?? "", jobTitle: cps?.find((x) => x.user_id === id)?.job_title ?? "", years: cps?.find((x) => x.user_id === id)?.years_experience ?? null, score: s ? Number(s.overall_match_score) : null, strengths: det.strengths ?? [] };
    });
    void buildCompareSummary;
    const candidates = list.map((c) => ({ name: shortName(c.firstName, c.lastName), jobTitle: c.jobTitle, years: c.years, score: c.score, strengths: c.strengths.slice(0, 3) }));
    const stamp = Date.now();
    let sent = 0;
    for (const m of team) {
      try {
        const r = await sendTemplateEmail("compare-share", m.email, {
          templateData: { recipientName: m.name, jobTitle: job.job_title, candidates, actionUrl: SITE },
          idempotencyKey: `team-compare-${data.jobId}-${m.stakeholder_id}-${stamp}`,
        });
        if (r.sent) sent++;
      } catch (e) { console.error("compare share email failed", e); }
    }
    return { sent, team: team.length };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE = "https://sundanceprofessionals.com";
const fmt = (d: string | null) => (d ? new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : undefined);

/**
 * Emails the other party about an offer event. The event is checked against the
 * offer's real state (read as the caller, RLS applies), so it cannot be forged.
 * Email failures never break the offer action itself.
 */
export const notifyOfferEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ offerId: z.string().uuid(), event: z.enum(["sent", "accepted", "declined", "negotiation"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: o } = await context.supabase.from("job_offers").select("*").eq("offer_id", data.offerId).maybeSingle();
    if (!o) return { sent: false };
    const uid = context.userId;
    const ok = data.event === "sent" ? o.recruiter_id === uid && o.status === "pending"
      : data.event === "negotiation" ? o.candidate_id === uid && o.status === "pending" && !!o.negotiated_at
      : o.candidate_id === uid && o.status === data.event;
    if (!ok) return { sent: false };
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { sendTemplateEmail } = await import("./email-templates/send-email");
      const { formatSalaryAmount } = await import("./salary");
      const { shortName } = await import("./compare-share");
      const [{ data: job }, { data: cand }, { data: rec }] = await Promise.all([
        supabaseAdmin.from("jobs").select("job_title, is_confidential, confidential_label, companies(company_name)").eq("job_id", o.job_id).maybeSingle(),
        supabaseAdmin.from("profiles").select("first_name, last_name, email").eq("user_id", o.candidate_id).maybeSingle(),
        supabaseAdmin.from("profiles").select("first_name, email").eq("user_id", o.recruiter_id).maybeSingle(),
      ]);
      const jobTitle = job?.job_title ?? "the role";
      const salary = formatSalaryAmount(o.salary_amount, o.salary_currency) || undefined;
      if (data.event === "sent") {
        if (!cand?.email) return { sent: false };
        const company = job?.is_confidential ? (job.confidential_label?.trim() || "Confidential Client") : ((job?.companies as { company_name?: string } | null)?.company_name || undefined);
        const r = await sendTemplateEmail("offer-candidate", cand.email, {
          templateData: {
            candidateName: cand.first_name, jobTitle, company, revision: o.revision, salary,
            bonus: o.signing_bonus ? formatSalaryAmount(o.signing_bonus, o.salary_currency) : undefined,
            equity: o.equity_details || undefined, startDate: fmt(o.start_date), respondBy: fmt(o.expires_on), note: o.notes || undefined,
            url: o.application_id ? `${SITE}/candidate/applications/${o.application_id}` : `${SITE}/candidate/applications`,
          },
          idempotencyKey: `offer-candidate-${o.offer_id}-r${o.revision}`,
        });
        return { sent: r.sent };
      }
      if (!rec?.email) return { sent: false };
      let reason: string | undefined;
      if (data.event === "declined") reason = o.decline_reason || undefined;
      const url = data.event === "negotiation" && o.negotiation_conversation_id
        ? `${SITE}/recruiter/messages/${o.negotiation_conversation_id}`
        : `${SITE}/recruiter/pipeline/${o.job_id}?candidate=${o.candidate_id}`;
      const r = await sendTemplateEmail("offer-recruiter-alert", rec.email, {
        templateData: { recruiterName: rec.first_name, candidateName: shortName(cand?.first_name ?? "", cand?.last_name ?? "") || "Your candidate", jobTitle, kind: data.event, salary, startDate: fmt(o.start_date), reason, url },
        idempotencyKey: `offer-recruiter-${o.offer_id}-r${o.revision}-${data.event}`,
      });
      return { sent: r.sent };
    } catch (e) {
      console.error("offer email failed", e);
      return { sent: false };
    }
  });

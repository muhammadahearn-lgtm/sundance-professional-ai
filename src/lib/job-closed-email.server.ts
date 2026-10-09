const SITE = "https://sundanceprofessionals.com";

/**
 * Sends the "position filled" notice for one closed-out application.
 * Only sends when the application is Not Moving Forward and the job is closed.
 */
export async function sendJobClosedNotice(applicationId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendTemplateEmail } = await import("./email-templates/send-email");
  const { data: app } = await supabaseAdmin.from("applications").select("application_id, candidate_id, application_status, job_id").eq("application_id", applicationId).maybeSingle();
  if (!app || app.application_status !== "rejected") return false;
  const [{ data: job }, { data: cand }] = await Promise.all([
    supabaseAdmin.from("jobs").select("job_title, job_status, is_confidential, confidential_label, companies(company_name)").eq("job_id", app.job_id).maybeSingle(),
    supabaseAdmin.from("profiles").select("first_name, email").eq("user_id", app.candidate_id).maybeSingle(),
  ]);
  if (!job || job.job_status !== "closed" || !cand?.email) return false;
  const company = job.is_confidential ? (job.confidential_label?.trim() || undefined) : ((job.companies as { company_name?: string } | null)?.company_name || undefined);
  const r = await sendTemplateEmail("job-closed-applicant", cand.email, {
    templateData: { candidateName: cand.first_name, jobTitle: job.job_title, company, url: `${SITE}/candidate/jobs` },
    idempotencyKey: `job-closed-${app.application_id}`,
  });
  return r.sent;
}

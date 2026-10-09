import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE = "https://sundanceprofessionals.com";
const uuid = z.string().uuid();

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}
async function mail(to: string, title: string, message: string, actionUrl: string, actionLabel: string, key: string) {
  try {
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const r = await sendTemplateEmail("activity-alert", to, { templateData: { title, message, actionUrl, actionLabel }, idempotencyKey: key });
    return !!r.sent;
  } catch (e) { console.error("reference email failed", e); return false; }
}
function companyOf(job: { is_confidential?: boolean | null; confidential_label?: string | null; companies?: unknown }) {
  return job.is_confidential ? (job.confidential_label?.trim() || "Confidential Client") : ((job.companies as { company_name?: string } | null)?.company_name ?? "");
}

/** Recruiter (job owner) asks a candidate for references. Optional, never blocks hiring. */
export const requestReferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: uuid, candidateId: uuid, count: z.number().int().min(1).max(3), message: z.string().max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { canRequestReferences } = await import("./references");
    const { data: job } = await db.from("jobs").select("job_title, recruiter_id").eq("job_id", data.jobId).maybeSingle();
    if (!job || job.recruiter_id !== context.userId) throw new Error("Only the job's recruiter can request references.");
    const { data: pipe } = await db.from("recruiting_pipeline").select("current_stage").eq("job_id", data.jobId).eq("candidate_id", data.candidateId).maybeSingle();
    if (!canRequestReferences(pipe?.current_stage)) throw new Error("References can be requested in Interviewing, Shortlisted or Offer.");
    const { data: row, error } = await db.from("reference_requests").insert({
      job_id: data.jobId, candidate_id: data.candidateId, recruiter_id: context.userId, target_count: data.count, message: data.message.trim(),
    }).select("request_id").single();
    if (error) throw new Error(error.code === "23505" ? "References were already requested for this job." : "Could not request references.");
    const { data: p } = await db.from("profiles").select("first_name, email").eq("user_id", data.candidateId).maybeSingle();
    if (p?.email) await mail(p.email, `References requested — ${job.job_title}`,
      `Hi ${p.first_name ?? "there"}, the recruiter for ${job.job_title} asked for ${data.count} professional reference${data.count > 1 ? "s" : ""}.${data.message.trim() ? ` Their note: "${data.message.trim()}"` : ""}`,
      `${SITE}/candidate/applications`, "Add references", `refreq-mail-${row.request_id}`);
    return { requestId: row.request_id };
  });

export const cancelReferenceRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ requestId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: r } = await db.from("reference_requests").select("recruiter_id").eq("request_id", data.requestId).maybeSingle();
    if (!r || r.recruiter_id !== context.userId) throw new Error("Not allowed.");
    await db.from("reference_requests").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("request_id", data.requestId);
    return { ok: true };
  });

/** Recruiter view of one candidate's references for a job, including answers. */
export const getReferenceSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: uuid, candidateId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: job } = await db.from("jobs").select("recruiter_id").eq("job_id", data.jobId).maybeSingle();
    if (!job || job.recruiter_id !== context.userId) return { owner: false as const };
    const [{ data: req }, { data: pipe }] = await Promise.all([
      db.from("reference_requests").select("request_id, target_count, status, message, created_at").eq("job_id", data.jobId).eq("candidate_id", data.candidateId).neq("status", "cancelled").maybeSingle(),
      db.from("recruiting_pipeline").select("current_stage").eq("job_id", data.jobId).eq("candidate_id", data.candidateId).maybeSingle(),
    ]);
    const { data: refs } = req ? await db.from("candidate_references")
      .select("reference_id, name, email, relationship, company, worked_together, status, confirmed_relationship, rating, strengths, growth, rehire_comment, confidential_note, submitted_at, reminded_at, created_at")
      .eq("request_id", req.request_id).order("created_at") : { data: [] };
    return { owner: true as const, stage: pipe?.current_stage ?? null, request: req ?? null, refs: refs ?? [] };
  });

/** Re-send a referee's link (issues a fresh 14-day token; the old one stops working). */
export const remindReferee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ referenceId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: ref } = await db.from("candidate_references").select("reference_id, request_id, job_id, candidate_id, name, email, status, reminded_at").eq("reference_id", data.referenceId).maybeSingle();
    if (!ref || ref.status !== "invited") throw new Error("This reference is already complete.");
    const { data: req } = await db.from("reference_requests").select("recruiter_id").eq("request_id", ref.request_id).maybeSingle();
    if (!req || req.recruiter_id !== context.userId) throw new Error("Not allowed.");
    if (ref.reminded_at && Date.now() - new Date(ref.reminded_at).getTime() < 864e5) throw new Error("You already sent a reminder in the last 24 hours.");
    const sent = await inviteReferee(db, ref, true);
    return { sent };
  });

type Db = Awaited<ReturnType<typeof admin>>;
async function inviteReferee(db: Db, ref: { reference_id: string; job_id: string; candidate_id: string; name: string; email: string }, reminder: boolean) {
  const { newReviewToken, hashToken } = await import("./team-review");
  const { REFERENCE_TTL_DAYS } = await import("./references");
  const { shortName } = await import("./compare-share");
  const token = newReviewToken();
  const now = Date.now();
  await db.from("candidate_references").update({
    token_hash: await hashToken(token), expires_at: new Date(now + REFERENCE_TTL_DAYS * 864e5).toISOString(), ...(reminder ? { reminded_at: new Date(now).toISOString() } : {}),
  }).eq("reference_id", ref.reference_id);
  const [{ data: p }, { data: job }] = await Promise.all([
    db.from("profiles").select("first_name, last_name").eq("user_id", ref.candidate_id).maybeSingle(),
    db.from("jobs").select("job_title, is_confidential, confidential_label, companies(company_name)").eq("job_id", ref.job_id).maybeSingle(),
  ]);
  const cand = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || shortName(p?.first_name ?? "", p?.last_name ?? "");
  const company = job ? companyOf(job) : "";
  return mail(ref.email, `${reminder ? "Reminder: " : ""}Reference request for ${cand}`,
    `Hi ${ref.name}, ${cand} listed you as a professional reference for ${job?.job_title ?? "a role"}${company ? ` at ${company}` : ""}. It takes about 2 minutes, no sign-in needed. The link expires in 14 days.`,
    `${SITE}/reference-check?t=${token}`, "Give reference", `ref-invite-${ref.reference_id}-${now}`);
}

/** Candidate's open reference requests (contacts + status only, never answers). */
export const myReferenceRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: req } = await db.from("reference_requests").select("request_id, target_count, status, message, created_at")
      .eq("job_id", data.jobId).eq("candidate_id", context.userId).neq("status", "cancelled").maybeSingle();
    if (!req) return null;
    const { data: refs } = await db.from("candidate_references").select("reference_id, name, email, relationship, company, status").eq("request_id", req.request_id).order("created_at");
    return { ...req, refs: refs ?? [] };
  });

const refSchema = z.object({ name: z.string().max(120), email: z.string().max(254), relationship: z.string(), company: z.string().max(160), workedTogether: z.string().max(120) });

export const submitReferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ requestId: uuid, refs: z.array(refSchema).min(1).max(3) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { validateReferences } = await import("./references");
    const { data: req } = await db.from("reference_requests").select("request_id, job_id, candidate_id, target_count, status").eq("request_id", data.requestId).maybeSingle();
    if (!req || req.candidate_id !== context.userId) throw new Error("Request not found.");
    if (req.status !== "awaiting_candidate") throw new Error("You already sent your references.");
    const { data: me } = await db.from("profiles").select("email").eq("user_id", context.userId).maybeSingle();
    const err = validateReferences(data.refs, req.target_count, me?.email);
    if (err) throw new Error(err);
    const { hashToken, newReviewToken } = await import("./team-review");
    const rows = await Promise.all(data.refs.map(async (r) => ({
      request_id: req.request_id, job_id: req.job_id, candidate_id: req.candidate_id, name: r.name.trim(), email: r.email.trim().toLowerCase(),
      relationship: r.relationship, company: r.company.trim(), worked_together: r.workedTogether.trim(),
      token_hash: await hashToken(newReviewToken()), expires_at: new Date().toISOString(),
    })));
    const { data: ins, error } = await db.from("candidate_references").insert(rows).select("reference_id, job_id, candidate_id, name, email");
    if (error || !ins) throw new Error("Could not save your references.");
    await db.from("reference_requests").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("request_id", req.request_id);
    let sent = 0;
    for (const r of ins) if (await inviteReferee(db, r, false)) sent++;
    return { sent };
  });

// ---------- Public referee form: caller is verified by the emailed token ----------
const tokenSchema = z.string().min(20).max(100);
async function loadRef(token: string) {
  const db = await admin();
  const { hashToken, isExpired } = await import("./team-review");
  const { data: ref } = await db.from("candidate_references").select("*").eq("token_hash", await hashToken(token)).maybeSingle();
  if (!ref) throw new Error("This reference link is not valid.");
  if (ref.status === "invited" && isExpired(ref.expires_at)) throw new Error("This reference link has expired. Ask the candidate or recruiter to resend it.");
  const { data: req } = await db.from("reference_requests").select("status, recruiter_id").eq("request_id", ref.request_id).maybeSingle();
  if (!req || req.status === "cancelled") throw new Error("This reference request is no longer needed. Thank you!");
  return { db, ref, req };
}

export const getRefereeForm = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const { db, ref } = await loadRef(data.token);
    const [{ data: p }, { data: job }] = await Promise.all([
      db.from("profiles").select("first_name, last_name").eq("user_id", ref.candidate_id).maybeSingle(),
      db.from("jobs").select("job_title, is_confidential, confidential_label, companies(company_name)").eq("job_id", ref.job_id).maybeSingle(),
    ]);
    return {
      candidate: [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "the candidate",
      jobTitle: job?.job_title ?? "", company: job ? companyOf(job) : "",
      referee: ref.name, relationship: ref.relationship, refCompany: ref.company, workedTogether: ref.worked_together,
      done: ref.status === "completed",
    };
  });

export const submitRefereeForm = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    token: tokenSchema, confirmed: z.boolean(), rating: z.number().int().min(1).max(5),
    strengths: z.string().max(1500), growth: z.string().max(1500), rehire: z.string().max(1000), confidential: z.string().max(1000),
  }).parse(d))
  .handler(async ({ data }) => {
    const { db, ref, req } = await loadRef(data.token);
    if (ref.status === "completed") throw new Error("You already submitted this reference. Thank you!");
    if (!data.strengths.trim()) throw new Error("Please share at least one strength.");
    const { referenceNoteText } = await import("./references");
    const content = referenceNoteText({ name: ref.name, relationship: ref.relationship, company: ref.company, rating: data.rating, strengths: data.strengths, growth: data.growth, rehire: data.rehire, confirmed: data.confirmed });
    const { data: note } = await db.from("candidate_notes").insert({ candidate_id: ref.candidate_id, author_id: req.recruiter_id, job_id: ref.job_id, content }).select("note_id").maybeSingle();
    const { error } = await db.from("candidate_references").update({
      status: "completed", confirmed_relationship: data.confirmed, rating: data.rating, strengths: data.strengths.trim(), growth: data.growth.trim(),
      rehire_comment: data.rehire.trim(), confidential_note: data.confidential.trim(), submitted_at: new Date().toISOString(), note_id: note?.note_id ?? null,
    }).eq("reference_id", ref.reference_id);
    if (error) throw new Error("Could not save your reference. Please try again.");
    const { data: all } = await db.from("candidate_references").select("status").eq("request_id", ref.request_id);
    const { data: rq } = await db.from("reference_requests").select("target_count").eq("request_id", ref.request_id).maybeSingle();
    const done = (all ?? []).filter((x) => x.status === "completed").length;
    if (rq && done >= rq.target_count) await db.from("reference_requests").update({ status: "completed", updated_at: new Date().toISOString() }).eq("request_id", ref.request_id);
    const { data: rp } = await db.from("profiles").select("email").eq("user_id", req.recruiter_id).maybeSingle();
    if (rp?.email) await mail(rp.email, `Reference received from ${ref.name}`, `${ref.name} rated "would work with them again" ${data.rating}/5. ${done} of ${rq?.target_count ?? done} references complete.`,
      `${SITE}/recruiter/candidates/${ref.candidate_id}?job=${ref.job_id}`, "Read reference", `ref-done-${ref.reference_id}`);
    return { ok: true };
  });

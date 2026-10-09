import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public endpoints: the caller is verified by the secret emailed token,
// which is checked (hash match + expiry) before any data is read.
const tokenSchema = z.string().min(20).max(100);

async function loadLink(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { hashToken, isExpired } = await import("./team-review");
  const { data: link } = await supabaseAdmin.from("team_review_links").select("job_id, stakeholder_id, candidate_ids, expires_at").eq("token_hash", await hashToken(token)).maybeSingle();
  if (!link) throw new Error("This review link is not valid.");
  if (isExpired(link.expires_at)) throw new Error("This review link has expired. Ask your recruiter to share again.");
  return { supabaseAdmin, link };
}

export const getTeamReview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin, link } = await loadLink(data.token);
    const { shortName } = await import("./compare-share");
    const ids = link.candidate_ids;
    const [{ data: job }, { data: sh }, { data: profs }, { data: cps }, { data: scores }, { data: rec }] = await Promise.all([
      supabaseAdmin.from("jobs").select("job_title, recruiter_id, is_confidential, confidential_label, companies(company_name)").eq("job_id", link.job_id).maybeSingle(),
      supabaseAdmin.from("job_stakeholders").select("name").eq("stakeholder_id", link.stakeholder_id).maybeSingle(),
      supabaseAdmin.from("profiles").select("user_id, first_name, last_name").in("user_id", ids),
      supabaseAdmin.from("candidate_profiles").select("user_id, job_title, years_experience").in("user_id", ids),
      supabaseAdmin.from("match_scores").select("candidate_id, overall_match_score, details").eq("job_id", link.job_id).in("candidate_id", ids),
      supabaseAdmin.from("team_recommendations").select("candidate_id, kind, note").eq("job_id", link.job_id).eq("stakeholder_id", link.stakeholder_id).maybeSingle(),
    ]);
    if (!job) throw new Error("This job is no longer available.");
    const { data: rp } = await supabaseAdmin.from("profiles").select("first_name, last_name").eq("user_id", job.recruiter_id).maybeSingle();
    const company = job.is_confidential ? (job.confidential_label?.trim() || "Confidential Client") : ((job.companies as { company_name?: string } | null)?.company_name ?? "");
    const candidates = ids.map((id) => {
      const p = profs?.find((x) => x.user_id === id); const cp = cps?.find((x) => x.user_id === id); const s = scores?.find((x) => x.candidate_id === id);
      const det = (s?.details ?? {}) as { strengths?: string[] };
      return { id, name: shortName(p?.first_name ?? "", p?.last_name ?? ""), jobTitle: cp?.job_title ?? "", years: cp?.years_experience ?? null, score: s ? Math.round(Number(s.overall_match_score)) : null, strengths: (det.strengths ?? []).slice(0, 3) };
    }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    return {
      jobTitle: job.job_title, company, reviewer: sh?.name ?? "", recruiter: [rp?.first_name, rp?.last_name].filter(Boolean).join(" ") || "your recruiter",
      candidates, current: rec ? { pick: rec.candidate_id, note: rec.note } : null,
    };
  });

export const submitTeamReview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: tokenSchema, pick: z.string().uuid().nullable(), note: z.string().max(500) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin, link } = await loadLink(data.token);
    const { validPick } = await import("./team-review");
    if (!validPick(data.pick, link.candidate_ids)) throw new Error("Please pick one of the shared candidates.");
    const { error } = await supabaseAdmin.from("team_recommendations").upsert({
      job_id: link.job_id, stakeholder_id: link.stakeholder_id, candidate_id: data.pick,
      kind: data.pick ? "recommend" : "pass_all", note: data.note.trim(), updated_at: new Date().toISOString(),
    }, { onConflict: "job_id,stakeholder_id" });
    if (error) throw new Error("Could not save your recommendation. Please try again.");
    try { await emailRecruiter(supabaseAdmin, link, data.pick, data.note.trim()); } catch (e) { console.error("recruiter alert email failed", e); }
    return { ok: true };
  });

// Alert the job's recruiter by email with a deep link to that job's pipeline.
async function emailRecruiter(
  supabaseAdmin: Awaited<ReturnType<typeof loadLink>>["supabaseAdmin"],
  link: { job_id: string; stakeholder_id: string },
  pick: string | null, note: string,
) {
  const { shortName } = await import("./compare-share");
  const { sendTemplateEmail } = await import("./email-templates/send-email");
  const [{ data: job }, { data: sh }] = await Promise.all([
    supabaseAdmin.from("jobs").select("job_title, recruiter_id, is_confidential, confidential_label, companies(company_name)").eq("job_id", link.job_id).maybeSingle(),
    supabaseAdmin.from("job_stakeholders").select("name, hiring_role").eq("stakeholder_id", link.stakeholder_id).maybeSingle(),
  ]);
  if (!job) return;
  const { data: rp } = await supabaseAdmin.from("profiles").select("first_name, email").eq("user_id", job.recruiter_id).maybeSingle();
  if (!rp?.email) return;
  let candidateName: string | undefined, candidateRole: string | undefined, score: number | null = null;
  if (pick) {
    const [{ data: p }, { data: cp }, { data: s }] = await Promise.all([
      supabaseAdmin.from("profiles").select("first_name, last_name").eq("user_id", pick).maybeSingle(),
      supabaseAdmin.from("candidate_profiles").select("job_title").eq("user_id", pick).maybeSingle(),
      supabaseAdmin.from("match_scores").select("overall_match_score").eq("job_id", link.job_id).eq("candidate_id", pick).maybeSingle(),
    ]);
    candidateName = shortName(p?.first_name ?? "", p?.last_name ?? "");
    candidateRole = cp?.job_title ?? undefined;
    score = s ? Math.round(Number(s.overall_match_score)) : null;
  }
  const company = job.is_confidential ? (job.confidential_label?.trim() || "Confidential Client") : ((job.companies as { company_name?: string } | null)?.company_name ?? "");
  await sendTemplateEmail("team-recommendation", rp.email, {
    templateData: {
      recruiterName: rp.first_name, reviewerName: sh?.name ?? "A hiring team member", reviewerRole: sh?.hiring_role ?? undefined,
      kind: pick ? "recommend" : "pass_all", candidateName, candidateRole, score, jobTitle: job.job_title, company: company || undefined,
      note: note || undefined, pipelineUrl: `https://sundanceprofessionals.com/recruiter/pipeline/${link.job_id}`,
    },
    idempotencyKey: `team-rec-${link.job_id}-${link.stakeholder_id}-${pick ?? "pass"}-${Date.now()}`,
  });
}

async function loadProfileLink(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { hashToken, isExpired } = await import("./team-review");
  const { data: link } = await supabaseAdmin.from("team_review_links")
    .select("token_hash, job_id, stakeholder_id, candidate_ids, expires_at, mode, verdict, feedback, note_id, created_by")
    .eq("token_hash", await hashToken(token)).maybeSingle();
  if (!link) throw new Error("This review link is not valid.");
  if (isExpired(link.expires_at)) throw new Error("This review link has expired. Ask your recruiter to share again.");
  return { supabaseAdmin, link };
}

/** Which review screen a link opens: comparison pick or single-profile feedback. */
export const getReviewMode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const { link } = await loadProfileLink(data.token);
    return { mode: link.mode as "compare" | "profile" };
  });

/** Privacy-masked profile: first name + last initial, no contact details, no current employer. */
export const getProfileReview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin, link } = await loadProfileLink(data.token);
    if (link.mode !== "profile") throw new Error("This review link is not valid.");
    const id = link.candidate_ids[0]!;
    const { shortName } = await import("./compare-share");
    const [{ data: job }, { data: sh }, { data: p }, { data: cp }, { data: s }, { data: exp }, { data: edu }, { data: langs }, { data: skills }, { data: techs }] = await Promise.all([
      supabaseAdmin.from("jobs").select("job_title, recruiter_id, is_confidential, confidential_label, companies(company_name)").eq("job_id", link.job_id).maybeSingle(),
      supabaseAdmin.from("job_stakeholders").select("name").eq("stakeholder_id", link.stakeholder_id).maybeSingle(),
      supabaseAdmin.from("profiles").select("first_name, last_name").eq("user_id", id).maybeSingle(),
      supabaseAdmin.from("candidate_profiles").select("headline, summary, job_title, years_experience").eq("user_id", id).maybeSingle(),
      supabaseAdmin.from("match_scores").select("overall_match_score, details").eq("job_id", link.job_id).eq("candidate_id", id).maybeSingle(),
      supabaseAdmin.from("work_experience").select("job_title, company_name, current_position, start_date, end_date, responsibilities").eq("candidate_id", id).order("start_date", { ascending: false }),
      supabaseAdmin.from("education").select("*").eq("candidate_id", id),
      supabaseAdmin.from("candidate_languages").select("programming_languages(language_name)").eq("candidate_id", id),
      supabaseAdmin.from("candidate_skills").select("technical_skills(skill_name)").eq("candidate_id", id),
      supabaseAdmin.from("candidate_technologies").select("technologies(technology_name)").eq("candidate_id", id),
    ]);
    if (!job) throw new Error("This job is no longer available.");
    const { data: rp } = await supabaseAdmin.from("profiles").select("first_name, last_name").eq("user_id", job.recruiter_id).maybeSingle();
    const company = job.is_confidential ? (job.confidential_label?.trim() || "Confidential Client") : ((job.companies as { company_name?: string } | null)?.company_name ?? "");
    const names = (rows: unknown[] | null, k: string, f: string) => (rows ?? []).map((r) => ((r as Record<string, Record<string, string> | null>)[k] ?? {})[f]).filter(Boolean) as string[];
    const det = (s?.details ?? {}) as { strengths?: string[] };
    return {
      jobTitle: job.job_title, company, reviewer: sh?.name ?? "",
      recruiter: [rp?.first_name, rp?.last_name].filter(Boolean).join(" ") || "your recruiter",
      candidate: {
        name: shortName(p?.first_name ?? "", p?.last_name ?? ""), headline: cp?.headline ?? "", summary: cp?.summary ?? "",
        jobTitle: cp?.job_title ?? "", years: cp?.years_experience ?? null,
        score: s ? Math.round(Number(s.overall_match_score)) : null, strengths: (det.strengths ?? []).slice(0, 4),
        // Current employer is never shown on review links.
        experience: (exp ?? []).map((e) => ({ title: e.job_title, company: e.current_position ? "Current employer" : e.company_name, start: e.start_date, end: e.current_position ? "Present" : e.end_date, summary: (e.responsibilities ?? "").slice(0, 600) })),
        education: (edu ?? []).map((e) => { const r = e as Record<string, unknown>; return [r.degree_type, r.field_of_study, r.institution_name, r.graduation_year].filter(Boolean).map(String).join(" · "); }).filter(Boolean),
        languages: names(langs, "programming_languages", "language_name"), skills: names(skills, "technical_skills", "skill_name"), technologies: names(techs, "technologies", "technology_name"),
      },
      current: link.verdict ? { verdict: link.verdict, feedback: link.feedback } : null,
    };
  });

export const submitProfileReview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: tokenSchema, verdict: z.string(), feedback: z.string().max(1000) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin, link } = await loadProfileLink(data.token);
    const { isVerdict, feedbackNoteText, verdictLabel } = await import("./team-review");
    if (link.mode !== "profile" || !isVerdict(data.verdict)) throw new Error("Please choose a recommendation.");
    const candidateId = link.candidate_ids[0]!;
    const [{ data: job }, { data: sh }] = await Promise.all([
      supabaseAdmin.from("jobs").select("job_title, recruiter_id").eq("job_id", link.job_id).maybeSingle(),
      supabaseAdmin.from("job_stakeholders").select("name, hiring_role").eq("stakeholder_id", link.stakeholder_id).maybeSingle(),
    ]);
    if (!job) throw new Error("This job is no longer available.");
    const author = link.created_by ?? job.recruiter_id;
    const content = feedbackNoteText(sh?.name ?? "A hiring team member", sh?.hiring_role, data.verdict, data.feedback);
    let noteId = link.note_id;
    if (noteId) {
      const { data: upd } = await supabaseAdmin.from("candidate_notes").update({ content, updated_at: new Date().toISOString() }).eq("note_id", noteId).select("note_id").maybeSingle();
      if (!upd) noteId = null;
    }
    if (!noteId) {
      const { data: ins, error } = await supabaseAdmin.from("candidate_notes").insert({ candidate_id: candidateId, author_id: author, job_id: link.job_id, content }).select("note_id").single();
      if (error) throw new Error("Could not save your feedback. Please try again.");
      noteId = ins.note_id;
    }
    const first = !link.verdict;
    const { error } = await supabaseAdmin.from("team_review_links").update({ verdict: data.verdict, feedback: data.feedback.trim(), submitted_at: new Date().toISOString(), note_id: noteId }).eq("token_hash", link.token_hash);
    if (error) throw new Error("Could not save your feedback. Please try again.");
    try {
      const { shortName } = await import("./compare-share");
      const { data: p } = await supabaseAdmin.from("profiles").select("first_name, last_name").eq("user_id", candidateId).maybeSingle();
      const cand = shortName(p?.first_name ?? "", p?.last_name ?? "") || "your candidate";
      const title = `${sh?.name ?? "Hiring team"}: ${verdictLabel(data.verdict)} on ${cand}`;
      const url = `/recruiter/candidates/${candidateId}?job=${link.job_id}`;
      await supabaseAdmin.rpc("create_notification", { _recipient: job.recruiter_id, _rtype: "recruiter", _type: "team_feedback", _category: "applications", _title: title, _message: data.feedback.trim().slice(0, 200) || `Feedback for ${job.job_title}`, _url: url, _priority: "high", _dedupe: `profile-review-${link.token_hash}-${Date.now()}` });
      if (first) {
        const { data: rp } = await supabaseAdmin.from("profiles").select("email").eq("user_id", job.recruiter_id).maybeSingle();
        if (rp?.email) {
          const { sendTemplateEmail } = await import("./email-templates/send-email");
          await sendTemplateEmail("activity-alert", rp.email, {
            templateData: { title, message: data.feedback.trim() ? `"${data.feedback.trim()}"` : `They gave ${cand} a ${verdictLabel(data.verdict)} for ${job.job_title}.`, actionUrl: `https://sundanceprofessionals.com${url}`, actionLabel: "Open candidate" },
            idempotencyKey: `profile-review-mail-${link.token_hash}`,
          });
        }
      }
    } catch (e) { console.error("profile feedback alert failed", e); }
    return { ok: true };
  });

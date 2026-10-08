import { formatSalaryAmount } from "./salary";
import { supabase } from "@/integrations/supabase/client";
import { computeCompletion } from "./profile-completion";
import type { TalentRow } from "./talent-rules";
import { chosenResume, type ResumeChoice, type StandardResumeSnapshot } from "./standard-resume";

type Profile = { user_id: string; job_title: string; current_employer: string; location: string; location_country?: string; location_state?: string; location_city?: string; years_experience: number; availability: string; headline: string; summary: string; salary_expectation: string; salary_amount: number | null; salary_currency: string; work_arrangement: string; industry_experience: string[]; role_id: string | null; current_level_id: string | null; updated_at: string; target_roles: string[]; resume_path: string | null; recruiter_resume_choice: string };

export async function namesFor(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const { data, error } = await supabase.rpc("candidate_names", { _ids: ids });
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r) => [r.user_id, `${r.first_name} ${r.last_name}`.trim() || "Candidate"]));
}

async function links(ids: string[]) {
  const [l, s, t, e, ed, c, ss] = await Promise.all([
    supabase.from("candidate_languages").select("candidate_id, lookup_id, proficiency_level, years_experience").in("candidate_id", ids),
    supabase.from("candidate_skills").select("candidate_id, lookup_id, proficiency_level, years_experience").in("candidate_id", ids),
    supabase.from("candidate_technologies").select("candidate_id, lookup_id, proficiency_level, years_experience").in("candidate_id", ids),
    supabase.from("work_experience").select("candidate_id").in("candidate_id", ids),
    supabase.from("education").select("candidate_id, degree_type, degree, field_of_study, institution_name, graduation_year").in("candidate_id", ids),
    supabase.from("certifications").select("candidate_id, certification_name").in("candidate_id", ids),
    supabase.from("candidate_soft_skills").select("candidate_id, lookup_id").in("candidate_id", ids),
  ]);
  const err = [l, s, t, e, ed, c].find((x) => x.error)?.error;
  if (err) throw err;
  const by = <T extends { candidate_id: string }>(rows: T[] | null, id: string) => (rows ?? []).filter((r) => r.candidate_id === id);
  return { ss: ss.data, l: l.data, s: s.data, t: t.data, e: e.data, ed: ed.data, c: c.data, by };
}

function toRow(p: Profile, name: string, k: Awaited<ReturnType<typeof links>>): TalentRow {
  const langs = k.by(k.l, p.user_id), skills = k.by(k.s, p.user_id), techs = k.by(k.t, p.user_id);
  const completion = computeCompletion({
    jobTitle: p.job_title, headline: p.headline, location: p.location, yearsExperience: p.years_experience, summary: p.summary,
    experienceCount: k.by(k.e, p.user_id).length, educationCount: k.by(k.ed, p.user_id).length, certificationCount: k.by(k.c, p.user_id).length,
    skillCount: skills.length, languageCount: langs.length, technologyCount: techs.length, targetRoleCount: p.target_roles.length, salaryExpectation: formatSalaryAmount(p.salary_amount, p.salary_currency), hasResume: !!p.resume_path,
  }).percent;
  return {
    id: p.user_id, name, jobTitle: p.job_title, employer: p.current_employer, location: p.location, country: p.location_country ?? "", state: p.location_state ?? "", city: p.location_city ?? "", years: p.years_experience, availability: p.availability,
    headline: p.headline, summary: p.summary, salary: formatSalaryAmount(p.salary_amount, p.salary_currency), salaryAmount: p.salary_amount, salaryCurrency: p.salary_currency, arrangement: p.work_arrangement, industries: p.industry_experience, roleId: p.role_id, levelId: p.current_level_id,
    langs: langs.map((x) => x.lookup_id), skills: skills.map((x) => x.lookup_id), softSkills: k.by(k.ss, p.user_id).map((x) => x.lookup_id), techs: techs.map((x) => x.lookup_id), updatedAt: p.updated_at, completion, education: k.by(k.ed, p.user_id), certs: k.by(k.c, p.user_id).map((x) => x.certification_name),
  };
}

const COLS = "user_id, job_title, current_employer, location, location_country, location_state, location_city, years_experience, availability, headline, summary, salary_expectation, salary_amount, salary_currency, work_arrangement, industry_experience, role_id, current_level_id, updated_at, target_roles, resume_path, recruiter_resume_choice";

/** All recruiter-searchable candidates (filtering happens client-side). */
export async function listTalent(): Promise<TalentRow[]> {
  const { data, error } = await supabase.from("candidate_profiles").select(COLS).in("visibility_status", ["public", "recruiter_searchable"]).limit(500);
  if (error) throw error;
  return rowsFor(data ?? []);
}

export async function talentByIds(ids: string[]): Promise<TalentRow[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("candidate_profiles").select(COLS).in("user_id", ids);
  if (error) throw error;
  return rowsFor(data ?? []);
}

async function rowsFor(ps: Profile[]) {
  const ids = ps.map((p) => p.user_id);
  if (!ids.length) return [];
  const [k, names, av] = await Promise.all([links(ids), namesFor(ids), supabase.rpc("candidate_avatars", { _ids: ids })]);
  const avatars = Object.fromEntries((av.data ?? []).map((r) => [r.user_id, r.avatar_path]));
  return ps.map((p) => ({ ...toRow(p, names[p.user_id] ?? "Candidate", k), avatarPath: avatars[p.user_id] ?? null }));
}

export async function loadCandidateFull(id: string) {
  const [p, l, s, t, e, ed, c, names, ss, pj, spoken, standard] = await Promise.all([
    supabase.from("candidate_profiles").select("*").eq("user_id", id).maybeSingle(),
    supabase.from("candidate_languages").select("lookup_id, proficiency_level, years_experience").eq("candidate_id", id),
    supabase.from("candidate_skills").select("lookup_id, proficiency_level, years_experience").eq("candidate_id", id),
    supabase.from("candidate_technologies").select("lookup_id, proficiency_level, years_experience").eq("candidate_id", id),
    supabase.from("work_experience").select("*").eq("candidate_id", id).order("start_date", { ascending: false }),
    supabase.from("education").select("*").eq("candidate_id", id).order("graduation_year", { ascending: false }),
    supabase.from("certifications").select("*").eq("candidate_id", id),
    namesFor([id]),
    supabase.from("candidate_soft_skills").select("lookup_id").eq("candidate_id", id),
    supabase.from("candidate_projects").select("project_id, title, description, project_url, technologies").eq("candidate_id", id).order("created_at"),
    supabase.from("candidate_spoken_languages").select("spoken_language_id, language_name, proficiency").eq("candidate_id", id).order("language_name"),
    supabase.from("standard_resume_versions").select("standard_resume_id, version_number, snapshot, pdf_path, include_photo, section_order, published_at").eq("candidate_id", id).order("version_number", { ascending: false }).limit(1),
  ]);
  const err = [p, l, s, t, e, ed, c, spoken, standard].find((x) => x.error)?.error;
  if (err) throw err;
  if (!p.data) return null;
  const pr = p.data;
  const completion = computeCompletion({
    jobTitle: pr.job_title, headline: pr.headline, location: pr.location, yearsExperience: pr.years_experience, summary: pr.summary,
    experienceCount: e.data?.length ?? 0, educationCount: ed.data?.length ?? 0, certificationCount: c.data?.length ?? 0, skillCount: s.data?.length ?? 0,
    languageCount: l.data?.length ?? 0, technologyCount: t.data?.length ?? 0, targetRoleCount: pr.target_roles.length, salaryExpectation: formatSalaryAmount(pr.salary_amount, pr.salary_currency), hasResume: !!pr.resume_path,
  }).percent;
  const av = await supabase.rpc("candidate_avatars", { _ids: [id] });
  const avatarPath: string | null = av.data?.[0]?.avatar_path ?? null;
  return { profile: pr, avatarPath, name: names[id] ?? "Candidate", languages: l.data ?? [], skills: s.data ?? [], technologies: t.data ?? [], softSkills: (ss.data ?? []).map((x) => x.lookup_id), spokenLanguages: spoken.data ?? [], standardResume: standard.data?.[0] ?? null, experience: e.data ?? [], education: ed.data ?? [], certifications: c.data ?? [], projects: pj.data ?? [], completion };
}
export type CandidateFull = NonNullable<Awaited<ReturnType<typeof loadCandidateFull>>>;

export async function resumeUrl(path: string, fileName: string | null) {
  const { data, error } = await supabase.storage.from("resumes").createSignedUrl(path, 60, { download: fileName ?? true });
  if (error) throw error;
  return data.signedUrl;
}

export function recruiterResume(d: CandidateFull) {
  const p = d.profile;
  const selected = chosenResume(p.recruiter_resume_choice as ResumeChoice, !!p.resume_path, !!d.standardResume);
  if (selected === "standard" && d.standardResume) return { kind: selected, path: d.standardResume.pdf_path, fileName: `${d.name}-Sundance-Resume-v${d.standardResume.version_number}.pdf`, version: d.standardResume.version_number, snapshot: d.standardResume.snapshot as StandardResumeSnapshot };
  if (selected === "original" && p.resume_path) return { kind: selected, path: p.resume_path, fileName: p.resume_file_name, version: null, snapshot: null };
  return null;
}

export async function listSavedCandidates(uid: string) {
  return (await listSavedEntries(uid)).map((r) => r.candidate_id);
}
export type SavedEntry = { candidate_id: string; job_id: string | null; saved_date: string };
export async function listSavedEntries(uid: string): Promise<SavedEntry[]> {
  const { data, error } = await supabase.from("saved_candidates").select("candidate_id, job_id, saved_date").eq("recruiter_id", uid).order("saved_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
/** Tag a saved candidate to one of the recruiter's jobs, or null for the general pool. */
export async function setSavedCandidateJob(uid: string, candidateId: string, jobId: string | null) {
  const { error } = await supabase.from("saved_candidates").update({ job_id: jobId }).eq("recruiter_id", uid).eq("candidate_id", candidateId);
  if (error) throw error;
}
/** Save a candidate (or re-tag an existing save) for one of the recruiter's jobs; null = general pool. */
export async function saveCandidateForJob(uid: string, candidateId: string, jobId: string | null) {
  const { error } = await supabase.from("saved_candidates").upsert({ recruiter_id: uid, candidate_id: candidateId, job_id: jobId }, { onConflict: "recruiter_id,candidate_id" });
  if (error) throw error;
}
/** The recruiter's own non-draft jobs with their hiring company, for saved-candidate tagging and filters. */
export async function loadSaveJobOptions(uid: string) {
  const { data, error } = await supabase.from("jobs").select("job_id, job_title, job_status, company_id, companies(company_name)").eq("recruiter_id", uid).neq("job_status", "draft").order("job_title");
  if (error) throw error;
  return (data ?? []).map((j) => ({ job_id: j.job_id, job_title: j.job_title, job_status: j.job_status, company_id: j.company_id, company_name: (j.companies as { company_name: string } | null)?.company_name ?? "Unknown company" }));
}
export async function listComparedCandidates(uid: string) {
  const { data, error } = await supabase.from("candidate_comparisons").select("candidate_id").eq("recruiter_id", uid).order("comparison_date");
  if (error) throw error;
  return (data ?? []).map((r) => r.candidate_id);
}
export async function setSavedCandidate(uid: string, id: string, on: boolean) {
  const r = on ? await supabase.from("saved_candidates").insert({ recruiter_id: uid, candidate_id: id }) : await supabase.from("saved_candidates").delete().eq("recruiter_id", uid).eq("candidate_id", id);
  if (r.error && r.error.code !== "23505") throw r.error;
}
export async function setComparedCandidate(uid: string, id: string, on: boolean) {
  const r = on ? await supabase.from("candidate_comparisons").insert({ recruiter_id: uid, candidate_id: id }) : await supabase.from("candidate_comparisons").delete().eq("recruiter_id", uid).eq("candidate_id", id);
  if (r.error && r.error.code !== "23505") throw r.error;
}

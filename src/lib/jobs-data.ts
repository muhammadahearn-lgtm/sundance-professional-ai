import { normalizePlan } from "./interview-plan";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatLocation, normalizeLocationPart } from "./location";
import type { ScreeningQ } from "./screening";
import { draftCompletion, parseHeadcount, type JobForm, type JobStatus, type ReqItem, type ReqLevel } from "./job-rules";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type Insert = Database["public"]["Tables"]["jobs"]["Insert"];

export async function loadTaxonomy() {
  const [r, l, s, t, ss, lv] = await Promise.all([
    supabase.from("roles").select("role_id, role_name, category, sort_order, is_active").order("sort_order"),
    supabase.from("programming_languages").select("language_id, language_name").order("language_name"),
    supabase.from("technical_skills").select("skill_id, skill_name").order("skill_name"),
    supabase.from("technologies").select("technology_id, technology_name, technology_category").order("technology_name"),
    supabase.from("soft_skills").select("soft_skill_id, soft_skill_name").order("soft_skill_name"),
    supabase.from("levels").select("level_id, level_name").order("sort_order"),
  ]);
  const err = [r, l, s, t, ss, lv].find((x) => x.error)?.error;
  if (err) throw err;
  const allRoles = (r.data ?? []).map((x) => ({ id: x.role_id, name: x.role_name, category: x.category, active: x.is_active }));
  return {
    /** Active master list only (pickers/filters). */
    roles: allRoles.filter((x) => x.active),
    /** Includes retired roles, for displaying old records. */
    allRoles,
    levels: (lv.data ?? []).map((x) => ({ id: x.level_id, name: x.level_name })),
    languages: (l.data ?? []).map((x) => ({ id: x.language_id, name: x.language_name })),
    skills: (s.data ?? []).map((x) => ({ id: x.skill_id, name: x.skill_name })),
    technologies: (t.data ?? []).map((x) => ({ id: x.technology_id, name: x.technology_name, group: x.technology_category })),
    softSkills: (ss.data ?? []).map((x) => ({ id: x.soft_skill_id, name: x.soft_skill_name })),
  };
}
export type Taxonomy = Awaited<ReturnType<typeof loadTaxonomy>>;

export async function loadMyCompany(uid: string) {
  const { data, error } = await supabase.from("recruiter_profiles").select("company_id").eq("user_id", uid).maybeSingle();
  if (error) throw error;
  if (!data?.company_id) return null;
  const c = await supabase.from("companies").select("*").eq("company_id", data.company_id).maybeSingle();
  if (c.error) throw c.error;
  return c.data;
}

export async function listJobs(uid: string) {
  const { data, error } = await supabase.from("jobs").select("*, companies(company_name)").eq("recruiter_id", uid);
  if (error) throw error;
  const ids = (data ?? []).map((j) => j.job_id);
  const counts: Record<string, number> = {};
  if (ids.length) {
    const a = await supabase.from("applications").select("job_id").in("job_id", ids);
    if (a.error) throw a.error;
    for (const r of a.data ?? []) counts[r.job_id] = (counts[r.job_id] ?? 0) + 1;
  }
  return (data ?? []).map((j) => ({ ...j, applications: counts[j.job_id] ?? 0 }));
}
export type JobListItem = Awaited<ReturnType<typeof listJobs>>[number];

export async function loadJob(id: string) {
  const [j, l, s, t, a, ss, sq] = await Promise.all([
    supabase.from("jobs").select("*").eq("job_id", id).maybeSingle(),
    supabase.from("job_languages").select("lookup_id, requirement_level").eq("job_id", id),
    supabase.from("job_skills").select("lookup_id, requirement_level").eq("job_id", id),
    supabase.from("job_technologies").select("lookup_id, requirement_level").eq("job_id", id),
    supabase.from("applications").select("application_status").eq("job_id", id),
    supabase.from("job_soft_skills").select("lookup_id, requirement_level").eq("job_id", id),
    supabase.from("job_screening_questions").select("*").eq("job_id", id).order("sort_order"),
  ]);
  const err = [j, l, s, t, a, ss, sq].find((x) => x.error)?.error;
  if (err) throw err;
  if (!j.data) return null;
  const map = (rows: { lookup_id: string; requirement_level: string }[] | null): ReqItem[] => (rows ?? []).map((r) => ({ id: r.lookup_id, level: r.requirement_level as ReqLevel }));
  let company = null;
  if (j.data.company_id) company = (await supabase.from("companies").select("*").eq("company_id", j.data.company_id).maybeSingle()).data;
  const apps = a.data ?? [];
  return {
    job: j.data, company, languages: map(l.data), skills: map(s.data), technologies: map(t.data), softSkills: map(ss.data),
    screening: (sq.data ?? []).map((r) => ({ id: r.question_id, text: r.question_text, type: r.question_type as ScreeningQ["type"], options: r.options, ideal: r.ideal_answer, required: r.is_required, knockout: r.is_knockout })),
    stats: { applications: apps.length, interviews: apps.filter((x) => x.application_status === "interviewing").length, offers: apps.filter((x) => x.application_status === "offer").length },
  };
}
export type LoadedJob = NonNullable<Awaited<ReturnType<typeof loadJob>>>;

export function toForm(d: LoadedJob): JobForm {
  const j = d.job;
  return {
    job_title: j.job_title, custom_title: j.custom_title ?? "", level_id: j.level_id ?? "", role_id: j.role_id ?? "", company_id: j.company_id ?? "", employment_type: j.employment_type, work_arrangement: j.work_arrangement,
    location: j.location, location_country: j.location_country, location_state: j.location_state, location_city: j.location_city, minimum_years_experience: String(j.minimum_years_experience), minimum_degree: j.minimum_degree ?? "", experience_level: j.experience_level, job_description: j.job_description,
    languages: d.languages, skills: d.skills, technologies: d.technologies, softSkills: d.softSkills,
    minimum_salary: j.minimum_salary?.toString() ?? "", maximum_salary: j.maximum_salary?.toString() ?? "", salary_currency: j.salary_currency,
    bonus_info: j.bonus_info, benefits_summary: j.benefits_summary, is_confidential: j.is_confidential, confidential_label: j.confidential_label, max_applications: j.max_applications?.toString() ?? "", headcount: String(j.headcount ?? 1),
    equity_type: j.equity_type, equity_range: j.equity_range, equity_vesting: j.equity_vesting, screening: d.screening, interview_plan: normalizePlan(j.interview_plan),
  };
}

function toRow(f: JobForm): Omit<Insert, "recruiter_id"> {
  const num = (v: string) => (v.trim() === "" ? null : Math.round(Number(v)));
  return {
    job_title: f.job_title.trim() || "Untitled Draft", completion_percent: draftCompletion(f), custom_title: f.custom_title.trim(), level_id: f.level_id || null, role_id: f.role_id || null, company_id: f.company_id || null,
    employment_type: f.employment_type as JobRow["employment_type"], work_arrangement: f.work_arrangement as JobRow["work_arrangement"],
    location: formatLocation({ country: f.location_country, state: f.location_state, city: f.location_city }) || f.location.trim(), location_country: f.location_country, location_state: normalizeLocationPart(f.location_state), location_city: normalizeLocationPart(f.location_city), minimum_years_experience: Number(f.minimum_years_experience) || 0, minimum_degree: f.minimum_degree || null, experience_level: f.experience_level,
    job_description: f.job_description, minimum_salary: num(f.minimum_salary), maximum_salary: num(f.maximum_salary),
    salary_currency: f.salary_currency, bonus_info: f.bonus_info.trim(), benefits_summary: f.benefits_summary.trim(), is_confidential: f.is_confidential, confidential_label: f.is_confidential ? f.confidential_label.trim().slice(0, 80) : "",
    headcount: parseHeadcount(f.headcount),
    max_applications: (() => { const n = num(f.max_applications); return n && n > 0 ? Math.min(n, 10000) : null; })(),
    equity_type: f.equity_type, equity_range: f.equity_type === "none" ? "" : f.equity_range.trim().slice(0, 80), equity_vesting: f.equity_type === "none" ? "" : f.equity_vesting.trim().slice(0, 160),
    interview_plan: normalizePlan(f.interview_plan) as unknown as JobRow["interview_plan"],
  };
}

async function replaceLinks(id: string, f: JobForm) {
  const rows = (items: ReqItem[]) => items.map((i) => ({ job_id: id, lookup_id: i.id, requirement_level: i.level, required_flag: i.level === "required" }));
  const del = await Promise.all([
    supabase.from("job_languages").delete().eq("job_id", id),
    supabase.from("job_skills").delete().eq("job_id", id),
    supabase.from("job_technologies").delete().eq("job_id", id),
    supabase.from("job_soft_skills").delete().eq("job_id", id),
  ]);
  const e1 = del.find((x) => x.error)?.error;
  if (e1) throw e1;
  const ins = await Promise.all([
    f.languages.length ? supabase.from("job_languages").insert(rows(f.languages)) : null,
    f.skills.length ? supabase.from("job_skills").insert(rows(f.skills)) : null,
    f.technologies.length ? supabase.from("job_technologies").insert(rows(f.technologies)) : null,
    f.softSkills.length ? supabase.from("job_soft_skills").insert(rows(f.softSkills)) : null,
  ]);
  const e2 = ins.find((x) => x?.error)?.error;
  if (e2) throw e2;
}

/** Create (status draft/active) or update a job and its structured requirements. */
export async function saveJob(uid: string, f: JobForm, opts: { id?: string | undefined; status?: JobStatus | undefined }) {
  let id = opts.id;
  if (id) {
    const patch = { ...toRow(f), ...(opts.status ? { job_status: opts.status } : {}) };
    const { error } = await supabase.from("jobs").update(patch).eq("job_id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("jobs").insert({ ...toRow(f), recruiter_id: uid, job_status: opts.status ?? "draft" }).select("job_id").single();
    if (error) throw error;
    id = data.job_id;
  }
  await replaceLinks(id, f);
  await saveScreening(id, f.screening);
  return id;
}

export async function setJobStatus(id: string, status: JobStatus) {
  const { error } = await supabase.from("jobs").update({ job_status: status }).eq("job_id", id);
  if (error) throw error;
}

export async function duplicateJob(uid: string, id: string) {
  const d = await loadJob(id);
  if (!d) throw new Error("Job not found");
  const f = toForm(d);
  return saveJob(uid, { ...f, job_title: `${f.job_title} (Copy)`, screening: f.screening.map((q) => ({ ...q, id: crypto.randomUUID() })) }, { status: "draft" });
}

export async function deleteJob(id: string) {
  const { count, error: ce } = await supabase.from("applications").select("application_id", { count: "exact", head: true }).eq("job_id", id);
  if (ce) throw ce;
  if ((count ?? 0) > 0) throw new Error("This job has applications and can't be deleted. Close it instead.");
  await Promise.all([
    supabase.from("job_languages").delete().eq("job_id", id),
    supabase.from("job_skills").delete().eq("job_id", id),
    supabase.from("job_technologies").delete().eq("job_id", id),
    supabase.from("job_soft_skills").delete().eq("job_id", id),
  ]);
  const { error } = await supabase.from("jobs").delete().eq("job_id", id);
  if (error) throw error;
}

/** A recruiter's non-draft jobs with their company, for company → job pickers. */
export async function listMyJobsWithCompany(uid: string) {
  const { data, error } = await supabase.from("jobs").select("job_id, job_title, company_id, companies(company_name)").eq("recruiter_id", uid).neq("job_status", "draft").order("job_title");
  if (error) throw error;
  return (data ?? []).map((j) => ({ id: j.job_id, title: j.job_title, companyId: j.company_id ?? "", company: j.companies?.company_name ?? "No company" }));
}

/** Upsert questions by id (keeps candidates' existing answers) and remove deleted ones. */
async function saveScreening(jobId: string, qs: ScreeningQ[]) {
  const keep = qs.filter((q) => q.text.trim());
  const del = supabase.from("job_screening_questions").delete().eq("job_id", jobId);
  const { error: de } = keep.length ? await del.not("question_id", "in", `(${keep.map((q) => q.id).join(",")})`) : await del;
  if (de) throw de;
  if (!keep.length) return;
  const rows = keep.map((q, i) => ({ question_id: q.id, job_id: jobId, question_text: q.text.trim(), question_type: q.type, options: q.type === "choice" ? q.options.map((o) => o.trim()).filter(Boolean) : [], ideal_answer: q.ideal.trim(), is_required: q.required, is_knockout: !!q.knockout && q.type !== "text" && !!q.ideal.trim(), sort_order: i }));
  const { error } = await supabase.from("job_screening_questions").upsert(rows, { onConflict: "question_id" });
  if (error) throw error;
}

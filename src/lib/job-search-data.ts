import { locationKey } from "./location";
import { meetsMinMatch } from "./match-engine";
import { supabase } from "@/integrations/supabase/client";
import type { Taxonomy } from "./jobs-data";
import type { ReqItem, ReqLevel } from "./job-rules";
import { PAGE_SIZE, experienceRange, intersect, relevance, sanitizeKeyword, type SearchState } from "./job-search";

const CARD_SELECT = "job_id, job_title, role_id, location, location_country, location_state, location_city, work_arrangement, employment_type, minimum_years_experience, experience_level, minimum_salary, maximum_salary, salary_currency, job_description, created_at, published_at, companies(company_id, company_name, logo_url, industry), job_languages(lookup_id, requirement_level), job_skills(lookup_id, requirement_level), job_technologies(lookup_id, requirement_level), job_soft_skills(lookup_id, requirement_level)";

async function idsFor(table: "job_languages" | "job_skills" | "job_technologies", lookups: string[]) {
  if (!lookups.length) return [];
  const { data, error } = await supabase.from(table).select("job_id").in("lookup_id", lookups);
  if (error) throw error;
  return (data ?? []).map((r) => r.job_id);
}

export async function searchJobs(s: SearchState, tax: Taxonomy, scores: Record<string, number> = {}) {
  let ids: string[] | null = null;
  if (s.langs.length) ids = intersect(ids, await idsFor("job_languages", s.langs));
  if (s.skills.length) ids = intersect(ids, await idsFor("job_skills", s.skills));
  if (s.techs.length) ids = intersect(ids, await idsFor("job_technologies", s.techs));

  let companyIds: string[] | null = null;
  const company = sanitizeKeyword(s.company);
  if (company) {
    const { data, error } = await supabase.from("companies").select("company_id").ilike("company_name", `%${company}%`);
    if (error) throw error;
    companyIds = (data ?? []).map((c) => c.company_id);
  }

  const q = sanitizeKeyword(s.q);
  const or: string[] = [];
  if (q) {
    const low = q.toLowerCase();
    const hit = (o: { id: string; name: string }[]) => o.filter((x) => x.name.toLowerCase().includes(low) || low.includes(x.name.toLowerCase())).map((x) => x.id);
    const [l, sk, t, co] = await Promise.all([
      idsFor("job_languages", hit(tax.languages)), idsFor("job_skills", hit(tax.skills)), idsFor("job_technologies", hit(tax.technologies)),
      supabase.from("companies").select("company_id").ilike("company_name", `%${q}%`),
    ]);
    if (co.error) throw co.error;
    const kw = [...new Set([...l, ...sk, ...t])];
    const roleIds = hit(tax.roles);
    or.push(`job_title.ilike.%${q}%`, `job_description.ilike.%${q}%`, `location.ilike.%${q}%`);
    if (kw.length) or.push(`job_id.in.(${kw.join(",")})`);
    if (roleIds.length) or.push(`role_id.in.(${roleIds.join(",")})`);
    const cIds = (co.data ?? []).map((c) => c.company_id);
    if (cIds.length) or.push(`company_id.in.(${cIds.join(",")})`);
  }

  if ((ids !== null && !ids.length) || (companyIds !== null && !companyIds.length)) return { rows: [], total: 0 };

  let query = supabase.from("jobs").select(CARD_SELECT, { count: "exact" }).eq("job_status", "active");
  if (ids !== null) query = query.in("job_id", ids);
  if (companyIds !== null) query = query.in("company_id", companyIds);
  if (or.length) query = query.or(or.join(","));
  if (s.role) query = query.eq("role_id", s.role);
  if (s.level) query = query.eq("level_id", s.level);
  if (s.arr.length) query = query.in("work_arrangement", s.arr as ("remote" | "hybrid" | "on_site")[]);
  if (s.emp.length) query = query.in("employment_type", s.emp as ("full_time" | "part_time" | "contract" | "consulting" | "internship")[]);
  const exp = experienceRange(s.exp);
  if (exp) { query = query.gte("minimum_years_experience", exp.min); if (exp.max !== null) query = query.lte("minimum_years_experience", exp.max); }
  if (s.smin) query = query.gte("maximum_salary", s.smin);
  if (s.smax) query = query.lte("minimum_salary", s.smax);
  const loc = sanitizeKeyword(s.loc);
  if (loc) query = query.ilike("location", `%${loc}%`);
  if (s.country) query = query.eq("location_country", s.country);
  if (s.state) query = query.eq("location_state_key", locationKey(s.state));
  if (s.city) query = query.eq("location_city_key", locationKey(s.city));

  if (s.sort === "oldest") query = query.order("created_at", { ascending: true });
  else if (s.sort === "salary_high") query = query.order("maximum_salary", { ascending: false, nullsFirst: false });
  else if (s.sort === "salary_low") query = query.order("minimum_salary", { ascending: true, nullsFirst: false });
  else query = query.order("created_at", { ascending: false });

  const from = (Math.max(1, s.page) - 1) * PAGE_SIZE;
  if (s.sort === "match" || s.sort === "match_low" || s.mm) {
    const { data, error } = await query;
    if (error) throw error;
    let ranked = (data ?? []).filter((r) => meetsMinMatch(scores[r.job_id], s.mm));
    const dir = s.sort === "match_low" ? -1 : 1;
    if (s.sort === "match" || s.sort === "match_low") ranked = [...ranked].sort((a, b) => dir * ((scores[b.job_id] ?? -1) - (scores[a.job_id] ?? -1)));
    else if (s.sort === "relevant" && q) ranked = [...ranked].sort((a, b) => relevance(b.job_title, b.job_description, q) - relevance(a.job_title, a.job_description, q));
    return { rows: ranked.slice(from, from + PAGE_SIZE), total: ranked.length };
  }
  const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  let rows = data ?? [];
  if (s.sort === "relevant" && q) rows = [...rows].sort((a, b) => relevance(b.job_title, b.job_description, q) - relevance(a.job_title, a.job_description, q));
  return { rows, total: count ?? 0 };
}
export type JobCardRow = Awaited<ReturnType<typeof searchJobs>>["rows"][number];

export async function loadCardsByIds(ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("jobs").select(CARD_SELECT).in("job_id", ids).eq("job_status", "active");
  if (error) throw error;
  return data ?? [];
}

export async function loadCandidateJob(id: string) {
  const [j, l, s, t, ss] = await Promise.all([
    supabase.from("jobs").select("*, companies(*)").eq("job_id", id).eq("job_status", "active").maybeSingle(),
    supabase.from("job_languages").select("lookup_id, requirement_level").eq("job_id", id),
    supabase.from("job_skills").select("lookup_id, requirement_level").eq("job_id", id),
    supabase.from("job_technologies").select("lookup_id, requirement_level").eq("job_id", id),
    supabase.from("job_soft_skills").select("lookup_id, requirement_level").eq("job_id", id),
  ]);
  const err = [j, l, s, t, ss].find((x) => x.error)?.error;
  if (err) throw err;
  if (!j.data) return null;
  const map = (rows: { lookup_id: string; requirement_level: string }[] | null): ReqItem[] => (rows ?? []).map((r) => ({ id: r.lookup_id, level: r.requirement_level as ReqLevel }));
  return { job: j.data, company: j.data.companies, languages: map(l.data), skills: map(s.data), technologies: map(t.data), softSkills: map(ss.data) };
}
export type CandidateJob = NonNullable<Awaited<ReturnType<typeof loadCandidateJob>>>;

export async function listSavedIds(uid: string) {
  const { data, error } = await supabase.from("saved_jobs").select("job_id, saved_date").eq("candidate_id", uid).order("saved_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => r.job_id);
}
export async function listCompareIds(uid: string) {
  const { data, error } = await supabase.from("job_comparisons").select("job_id, comparison_date").eq("candidate_id", uid).order("comparison_date");
  if (error) throw error;
  return (data ?? []).map((r) => r.job_id);
}
export async function setSaved(uid: string, jobId: string, saved: boolean) {
  const r = saved ? await supabase.from("saved_jobs").insert({ candidate_id: uid, job_id: jobId }) : await supabase.from("saved_jobs").delete().eq("candidate_id", uid).eq("job_id", jobId);
  if (r.error && r.error.code !== "23505") throw r.error;
}
export async function setCompared(uid: string, jobId: string, on: boolean) {
  const r = on ? await supabase.from("job_comparisons").insert({ candidate_id: uid, job_id: jobId }) : await supabase.from("job_comparisons").delete().eq("candidate_id", uid).eq("job_id", jobId);
  if (r.error && r.error.code !== "23505") throw r.error;
}

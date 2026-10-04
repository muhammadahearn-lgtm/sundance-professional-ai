import { supabase } from "@/integrations/supabase/client";
import { loadTaxonomy } from "./jobs-data";
import { loadCandidateFull } from "./talent-data";
import { careerReport, type MarketJob, type ScoreLite } from "./career-engine";

/** Load everything the career engine needs, build the report, and store today's snapshot for trend tracking. */
export async function loadCareer(uid: string) {
  const [me, tax, jobsQ, jl, js, jt, sc] = await Promise.all([
    loadCandidateFull(uid),
    loadTaxonomy(),
    supabase.from("jobs").select("job_id, job_title, role_id, minimum_salary, maximum_salary, minimum_years_experience").eq("job_status", "active"),
    supabase.from("job_languages").select("job_id, lookup_id, requirement_level"),
    supabase.from("job_skills").select("job_id, lookup_id, requirement_level"),
    supabase.from("job_technologies").select("job_id, lookup_id, requirement_level"),
    supabase.from("match_scores").select("job_id, overall_match_score, skill_alignment_score, technology_alignment_score, experience_alignment_score, jobs!inner(job_title, job_status, companies(company_name))").eq("candidate_id", uid).eq("jobs.job_status", "active"),
  ]);
  const err = [jobsQ, jl, js, jt, sc].find((x) => x.error)?.error;
  if (err) throw err;
  if (!me) throw new Error("Missing Candidate Data");

  const names: Record<string, string> = {};
  for (const o of [...tax.languages, ...tax.skills, ...tax.technologies]) names[o.id] = o.name;
  const by = (rows: { job_id: string; lookup_id: string; requirement_level: string }[]) => {
    const m: Record<string, { id: string; level: string }[]> = {};
    for (const r of rows) (m[r.job_id] ??= []).push({ id: r.lookup_id, level: r.requirement_level });
    return m;
  };
  const L = by(jl.data ?? []), S = by(js.data ?? []), T = by(jt.data ?? []);
  const jobs: MarketJob[] = (jobsQ.data ?? []).map((j) => ({
    id: j.job_id, title: j.job_title, roleId: j.role_id, minSalary: j.minimum_salary, maxSalary: j.maximum_salary, minYears: j.minimum_years_experience,
    langs: L[j.job_id] ?? [], skills: S[j.job_id] ?? [], techs: T[j.job_id] ?? [],
  }));
  const scoreRows = sc.data ?? [];
  const scores: ScoreLite[] = scoreRows.map((r) => ({ jobId: r.job_id, overall: Number(r.overall_match_score), skills: Number(r.skill_alignment_score), technologies: Number(r.technology_alignment_score), experience: Number(r.experience_alignment_score) }));
  const jobInfo = Object.fromEntries(scoreRows.map((r) => [r.job_id, { title: r.jobs.job_title, company: r.jobs.companies?.company_name ?? "" }]));

  const p = me.profile;
  const report = careerReport({
    title: p.job_title, years: p.years_experience, location: p.location, targetRoles: p.target_roles, roleId: p.role_id,
    langs: me.languages.map((x) => x.lookup_id), skills: me.skills.map((x) => x.lookup_id), techs: me.technologies.map((x) => x.lookup_id),
    certifications: me.certifications.map((x) => x.certification_name), completion: me.completion,
  }, jobs, scores, names);

  await supabase.from("career_snapshots").upsert({
    candidate_id: uid, snapshot_date: new Date().toISOString().slice(0, 10), readiness_score: report.readiness.score, average_match: report.averageMatch,
    profile_completion: me.completion, skill_count: me.skills.length + me.languages.length, technology_count: me.technologies.length,
    details: { tier: report.readiness.tier, parts: report.readiness.parts },
  }, { onConflict: "candidate_id,snapshot_date" });
  const hist = await supabase.from("career_snapshots").select("snapshot_date, readiness_score, average_match, profile_completion, skill_count, technology_count").eq("candidate_id", uid).order("snapshot_date", { ascending: true }).limit(30);

  return { report, jobInfo, history: hist.data ?? [] };
}
export type CareerData = Awaited<ReturnType<typeof loadCareer>>;

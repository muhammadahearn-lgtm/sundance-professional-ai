import { computeMatch, type MatchCandidate, type MatchJob, type Req } from "./match-engine";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

const group = <T extends { lookup_id: string }>(rows: T[], key: (r: T) => string, map: (r: T) => string | Req) => {
  const out: Record<string, (string | Req)[]> = {};
  for (const r of rows) (out[key(r)] ??= []).push(map(r));
  return out;
};

/** Recompute and store scores for every (candidate, job) pair given. Server-only (service role). */
export async function recalcPairs(admin: Admin, candidateIds: string[], jobIds: string[]) {
  if (!candidateIds.length || !jobIds.length) return 0;
  const [jobs, jl, js, jt, cps, cl, cs, ct, l, s, t] = await Promise.all([
    admin.from("jobs").select("job_id, minimum_years_experience, work_arrangement, location, role_id, job_title, maximum_salary, salary_currency").in("job_id", jobIds),
    admin.from("job_languages").select("job_id, lookup_id, requirement_level").in("job_id", jobIds),
    admin.from("job_skills").select("job_id, lookup_id, requirement_level").in("job_id", jobIds),
    admin.from("job_technologies").select("job_id, lookup_id, requirement_level").in("job_id", jobIds),
    admin.from("candidate_profiles").select("user_id, years_experience, work_arrangement, location, locations_of_interest, target_roles, role_id, availability, salary_amount, salary_currency").in("user_id", candidateIds),
    admin.from("candidate_languages").select("candidate_id, lookup_id").in("candidate_id", candidateIds),
    admin.from("candidate_skills").select("candidate_id, lookup_id").in("candidate_id", candidateIds),
    admin.from("candidate_technologies").select("candidate_id, lookup_id").in("candidate_id", candidateIds),
    admin.from("programming_languages").select("language_id, language_name"),
    admin.from("technical_skills").select("skill_id, skill_name"),
    admin.from("technologies").select("technology_id, technology_name"),
  ]);
  const err = [jobs, jl, js, jt, cps, cl, cs, ct, l, s, t].find((x) => x.error)?.error;
  if (err) throw new Error(err.message);
  const names: Record<string, string> = {};
  for (const x of l.data ?? []) names[x.language_id] = x.language_name;
  for (const x of s.data ?? []) names[x.skill_id] = x.skill_name;
  for (const x of t.data ?? []) names[x.technology_id] = x.technology_name;

  const req = (r: { lookup_id: string; requirement_level: string }) => ({ id: r.lookup_id, level: r.requirement_level });
  const JL = group(jl.data ?? [], (r) => r.job_id, req), JS = group(js.data ?? [], (r) => r.job_id, req), JT = group(jt.data ?? [], (r) => r.job_id, req);
  const id = (r: { lookup_id: string }) => r.lookup_id;
  const CL = group(cl.data ?? [], (r) => r.candidate_id, id), CS = group(cs.data ?? [], (r) => r.candidate_id, id), CT = group(ct.data ?? [], (r) => r.candidate_id, id);

  const rows = [];
  const now = new Date().toISOString();
  for (const p of cps.data ?? []) {
    const c: MatchCandidate = {
      langs: (CL[p.user_id] ?? []) as string[], skills: (CS[p.user_id] ?? []) as string[], techs: (CT[p.user_id] ?? []) as string[],
      years: p.years_experience, workArrangement: p.work_arrangement, location: p.location, locationsOfInterest: p.locations_of_interest,
      targetRoles: p.target_roles, roleId: p.role_id, availability: p.availability, salaryAmount: p.salary_amount, salaryCurrency: p.salary_currency,
    };
    for (const j of jobs.data ?? []) {
      const job: MatchJob = {
        langs: (JL[j.job_id] ?? []) as Req[], skills: (JS[j.job_id] ?? []) as Req[], techs: (JT[j.job_id] ?? []) as Req[],
        minYears: j.minimum_years_experience, workArrangement: j.work_arrangement, location: j.location, roleId: j.role_id, title: j.job_title, maxSalary: j.maximum_salary, salaryCurrency: j.salary_currency,
      };
      const m = computeMatch(c, job, names);
      rows.push({
        candidate_id: p.user_id, job_id: j.job_id, overall_match_score: m.overall, language_alignment_score: m.languages,
        skill_alignment_score: m.skills, technology_alignment_score: m.technologies, experience_alignment_score: m.experience,
        preference_alignment_score: m.preferences, career_readiness_score: m.preferences, details: m.details, calculated_date: now,
      });
    }
  }
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from("match_scores").upsert(rows.slice(i, i + 500), { onConflict: "candidate_id,job_id" });
    if (error) throw new Error(error.message);
  }
  return rows.length;
}

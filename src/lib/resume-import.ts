// Browser helpers for resume auto-fill: load governed lists and write a reviewed plan.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Catalogs } from "./resume-taxonomy-matcher";
import type { CatalogCert } from "./certifications";
import { planResumeImport, type Existing, type ResumeImportPlan } from "./resume-apply";
import type { ParsedResume } from "./resume-parse";
import type { MatchedResume } from "./resume-taxonomy-matcher";

export function useResumeCatalogs() {
  return useQuery({
    queryKey: ["resume-catalogs"], staleTime: 10 * 60_000,
    queryFn: async (): Promise<Catalogs> => {
      const [r, l, s, t, ss, c, co] = await Promise.all([
        supabase.from("roles").select("role_id, role_name").eq("is_active", true),
        supabase.from("programming_languages").select("language_id, language_name"),
        supabase.from("technical_skills").select("skill_id, skill_name"),
        supabase.from("technologies").select("technology_id, technology_name"),
        supabase.from("soft_skills").select("soft_skill_id, soft_skill_name"),
        supabase.from("certification_catalog").select("catalog_id, name, abbreviation, issuer, category, aliases"),
        supabase.from("countries").select("country_name"),
      ]);
      return {
        roles: (r.data ?? []).map((x) => ({ id: x.role_id, name: x.role_name })),
        languages: (l.data ?? []).map((x) => ({ id: x.language_id, name: x.language_name })),
        skills: (s.data ?? []).map((x) => ({ id: x.skill_id, name: x.skill_name })),
        technologies: (t.data ?? []).map((x) => ({ id: x.technology_id, name: x.technology_name })),
        softSkills: (ss.data ?? []).map((x) => ({ id: x.soft_skill_id, name: x.soft_skill_name })),
        certifications: (c.data ?? []) as CatalogCert[],
        countries: (co.data ?? []).map((x) => x.country_name),
      };
    },
  });
}

export async function loadExisting(uid: string): Promise<Existing> {
  const [l, s, t, ss, j, e, c] = await Promise.all([
    supabase.from("candidate_languages").select("lookup_id").eq("candidate_id", uid),
    supabase.from("candidate_skills").select("lookup_id").eq("candidate_id", uid),
    supabase.from("candidate_technologies").select("lookup_id").eq("candidate_id", uid),
    supabase.from("candidate_soft_skills").select("lookup_id").eq("candidate_id", uid),
    supabase.from("work_experience").select("company_name, job_title").eq("candidate_id", uid),
    supabase.from("education").select("institution_name").eq("candidate_id", uid),
    supabase.from("certifications").select("certification_name").eq("candidate_id", uid),
  ]);
  const ids = (x: { data: { lookup_id: string }[] | null }) => (x.data ?? []).map((r) => r.lookup_id);
  return { languageIds: ids(l), skillIds: ids(s), technologyIds: ids(t), softSkillIds: ids(ss), jobs: j.data ?? [], schools: e.data ?? [], certs: c.data ?? [] };
}

/** Writes the plan. Returns the number of sections that failed (0 = all good). */
export async function applyResumePlan(uid: string, pl: ResumeImportPlan): Promise<number> {
  const link = (ids: string[]) => ids.map((lookup_id) => ({ candidate_id: uid, lookup_id }));
  const ops = [
    pl.languageIds.length && supabase.from("candidate_languages").insert(link(pl.languageIds)),
    pl.skillIds.length && supabase.from("candidate_skills").insert(link(pl.skillIds)),
    pl.technologyIds.length && supabase.from("candidate_technologies").insert(link(pl.technologyIds)),
    pl.softSkillIds.length && supabase.from("candidate_soft_skills").insert(link(pl.softSkillIds)),
    pl.jobs.length && supabase.from("work_experience").insert(pl.jobs.map((r) => ({ ...r, candidate_id: uid }))),
    pl.education.length && supabase.from("education").insert(pl.education.map((r) => ({ ...r, candidate_id: uid }))),
    pl.certifications.length && supabase.from("certifications").insert(pl.certifications.map((r) => ({ ...r, candidate_id: uid }))),
  ].filter(Boolean);
  const res = await Promise.all(ops as PromiseLike<{ error: unknown }>[]);
  return res.filter((r) => r.error).length;
}

export async function importResume(uid: string, p: ParsedResume, m: MatchedResume) {
  return applyResumePlan(uid, planResumeImport(p, m, await loadExisting(uid)));
}

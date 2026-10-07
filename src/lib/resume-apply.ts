// Turns a reviewed resume into rows to add to a candidate's profile.
// Pure planning (no I/O) so the rules are testable: never duplicate what the
// candidate already has, skip entries missing required data, never create list entries.
import type { ParsedResume } from "./resume-parse";
import type { MatchedResume } from "./resume-taxonomy-matcher";
import { looseKey } from "./resume-taxonomy-matcher";

export type Existing = {
  languageIds: string[]; skillIds: string[]; technologyIds: string[]; softSkillIds: string[];
  jobs: { company_name: string; job_title: string }[];
  schools: { institution_name: string }[];
  certs: { certification_name: string }[];
};
export const EMPTY_EXISTING: Existing = { languageIds: [], skillIds: [], technologyIds: [], softSkillIds: [], jobs: [], schools: [], certs: [] };

const isDate = (v: string | null) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function planResumeImport(p: ParsedResume, m: MatchedResume, ex: Existing) {
  const fresh = (items: { id: string }[], have: string[]) => [...new Set(items.map((i) => i.id))].filter((id) => !have.includes(id));
  const jobKey = (c: string, t: string) => `${looseKey(c)}|${looseKey(t)}`;
  const haveJobs = new Set(ex.jobs.map((j) => jobKey(j.company_name, j.job_title)));
  const haveSchools = new Set(ex.schools.map((s) => looseKey(s.institution_name)));
  const haveCerts = new Set(ex.certs.map((c) => looseKey(c.certification_name)));

  const jobs = p.experience
    .filter((e) => e.company_name.trim() && e.job_title.trim() && isDate(e.start_date))
    .filter((e) => { const k = jobKey(e.company_name, e.job_title); if (haveJobs.has(k)) return false; haveJobs.add(k); return true; })
    .map((e) => ({
      company_name: e.company_name.trim().slice(0, 120), job_title: e.job_title.trim().slice(0, 120), location: e.location.trim().slice(0, 120),
      start_date: e.start_date, end_date: e.current_position || !isDate(e.end_date) ? null : e.end_date,
      current_position: e.current_position, responsibilities: e.responsibilities.trim().slice(0, 4000), technologies_used: e.technologies_used.slice(0, 30),
    }));

  const education = m.education
    .filter((e) => e.institution_name.trim() && e.degree_type && e.field_of_study.trim())
    .filter((e) => { const k = looseKey(e.institution_name); if (haveSchools.has(k)) return false; haveSchools.add(k); return true; })
    .map((e) => ({ institution_name: e.institution_name.trim(), degree_type: e.degree_type!, degree: e.degree_type!, field_of_study: e.field_of_study.trim(), graduation_year: e.graduation_year }));

  const certifications = m.certifications
    .map((c) => ({ certification_name: (c.catalog?.name ?? c.name).trim(), issuing_organization: (c.catalog?.issuer ?? c.issuer).trim(), issue_date: isDate(c.issue_date) ? c.issue_date : null, catalog_id: c.catalog?.catalog_id ?? null }))
    .filter((c) => c.certification_name)
    .filter((c) => { const k = looseKey(c.certification_name); if (haveCerts.has(k)) return false; haveCerts.add(k); return true; });

  return {
    languageIds: fresh(m.languages, ex.languageIds), skillIds: fresh(m.skills, ex.skillIds),
    technologyIds: fresh(m.technologies, ex.technologyIds), softSkillIds: fresh(m.softSkills, ex.softSkillIds),
    jobs, education, certifications,
  };
}
export type ResumeImportPlan = ReturnType<typeof planResumeImport>;

export function planCount(pl: ResumeImportPlan) {
  return pl.languageIds.length + pl.skillIds.length + pl.technologyIds.length + pl.softSkillIds.length + pl.jobs.length + pl.education.length + pl.certifications.length;
}

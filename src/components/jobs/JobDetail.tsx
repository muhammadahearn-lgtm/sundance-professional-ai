import { equitySummary } from "@/lib/screening";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Eye, Lock, MapPin, Sparkles } from "lucide-react";
import type { Account } from "@/lib/account";
import { jobQuality } from "@/lib/job-rules";
import { loadJob, loadTaxonomy } from "@/lib/jobs-data";
import { card, friendlyError } from "@/components/profile/parts";
import { BrandImg, CompletionCard, Item } from "@/components/recruiter/shared";
import { Markdown } from "./Markdown";
import { ARRANGEMENT, EMPLOYMENT, RequirementList, StatusBadge, formatSalary, lbl } from "./shared";
import { JobActionBar } from "./JobActions";
import { SourcedCandidatesPanel } from "@/components/talent/Talent";

export async function loadJobPage(id: string) {
  const [d, tax] = await Promise.all([loadJob(id), loadTaxonomy()]);
  return d ? { ...d, tax } : null;
}
export type JobPage = NonNullable<Awaited<ReturnType<typeof loadJobPage>>>;

export function useJobPage(id: string) {
  return useQuery({ queryKey: ["job", id], queryFn: () => loadJobPage(id) });
}

export function JobPageState({ q, children }: { q: ReturnType<typeof useJobPage>; children: (d: JobPage) => React.ReactNode }) {
  if (q.isLoading) return <div className={`${card} h-96 animate-pulse`} />;
  if (q.error) return <div className={`${card} p-8 text-center`}><p className="font-semibold">{friendlyError(q.error, "We couldn't load this job.")}</p><button onClick={() => q.refetch()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button></div>;
  if (!q.data) return <div className={`${card} p-8 text-center`}><p className="font-semibold">Job not found.</p><Link to="/recruiter/jobs" className="mt-3 inline-block text-sm font-semibold text-primary">Back to jobs</Link></div>;
  return <>{children(q.data)}</>;
}

export function qualityOf(d: JobPage) {
  const j = d.job;
  return jobQuality({ title: j.job_title, description: j.job_description, minSalary: j.minimum_salary, maxSalary: j.maximum_salary, skills: d.skills.length, technologies: d.technologies.length, languages: d.languages.length, minYears: j.minimum_years_experience, experienceLevel: j.experience_level, benefits: j.benefits_summary });
}

export function JobDetail({ account, id }: { account: Account; id: string }) {
  const q = useJobPage(id);
  const navigate = useNavigate();
  return (
    <JobPageState q={q}>{(d) => {
      const j = d.job, { percent, recommendations } = qualityOf(d);
      const role = d.tax.roles.find((r) => r.id === j.role_id)?.name;
      return (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-6">
            <Link to="/recruiter/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />All jobs</Link>
            <div className={`${card} p-6`}>
              <div className="flex items-start gap-4">
                {d.company?.logo_url ? <BrandImg path={d.company.logo_url} alt="Company logo" className="h-14 w-14 shrink-0 rounded-xl object-cover" /> : <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-muted"><Building2 className="h-6 w-6 text-muted-foreground" /></div>}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-2xl font-extrabold">{j.job_title}</h1><StatusBadge s={j.job_status} /></div>
                  <p className="text-sm">{d.company?.company_name}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{j.location} · {lbl(ARRANGEMENT, j.work_arrangement)} · {lbl(EMPLOYMENT, j.employment_type)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Last updated {new Date(j.updated_at).toLocaleString()}</p>
                </div>
              </div>
              {j.job_status === "closed" && <p className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground"><Lock className="h-4 w-4" />This job is closed and read-only.</p>}
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/recruiter/jobs/$id/preview" params={{ id }} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary"><Eye className="h-4 w-4" />Preview</Link>
                <JobActionBar uid={account.userId} id={id} status={j.job_status} applications={d.stats.applications} onDeleted={() => navigate({ to: "/recruiter/jobs" })} />
              </div>
            </div>

            <div className={`${card} p-6`}>
              <h2 className="font-display text-lg font-bold">Job Information</h2>
              <dl className="mt-4 grid gap-5 sm:grid-cols-3">
                <Item k="Role" v={role} /><Item k="Employment Type" v={lbl(EMPLOYMENT, j.employment_type)} /><Item k="Work Arrangement" v={lbl(ARRANGEMENT, j.work_arrangement)} />
                <Item k="Minimum Experience" v={`${j.minimum_years_experience}+ years`} /><Item k="Experience Level" v={j.experience_level} /><Item k="Salary" v={formatSalary(j.minimum_salary, j.maximum_salary, j.salary_currency)} />
                <Item k="Bonus" v={j.bonus_info} />
                <Item k="Equity" v={[equitySummary(j), j.equity_vesting].filter(Boolean).join(" · ")} />
              </dl>
            </div>
            <div className={`${card} space-y-5 p-6`}>
              <h2 className="font-display text-lg font-bold">Structured Requirements</h2>
              <Item k="Programming Languages" v={<RequirementList items={d.languages} options={d.tax.languages} />} />
              <Item k="Technical Skills" v={<RequirementList items={d.skills} options={d.tax.skills} />} />
              <Item k="Soft Skills Required" v={<RequirementList items={d.softSkills} options={d.tax.softSkills} />} />
              <Item k="Tools & Technologies" v={<RequirementList items={d.technologies} options={d.tax.technologies} />} />
            </div>
            {j.job_status !== "draft" && <SourcedCandidatesPanel uid={account.userId} jobId={id} />}
            <div className={`${card} p-6`}><h2 className="mb-4 font-display text-lg font-bold">Description</h2><Markdown text={j.job_description} />
              {j.benefits_summary && <><h3 className="mt-6 font-display text-base font-bold">Benefits</h3><p className="mt-2 whitespace-pre-line text-sm">{j.benefits_summary}</p></>}</div>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <CompletionCard title="Job Quality Score" percent={percent} suggestions={recommendations} />
            <div className={`${card} p-5`}>
              <p className="font-display font-bold">Applications</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[["Applications", d.stats.applications], ["Interviews", d.stats.interviews], ["Offers", d.stats.offers]].map(([l, n]) => (
                  <div key={l} className="rounded-xl bg-muted/50 p-3"><p className="font-display text-xl font-extrabold">{n}</p><p className="text-[11px] text-muted-foreground">{l}</p></div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Interview pipeline, offer pipeline and candidate activity arrive with Applications.</p>
            </div>
            <div className={`${card} border-dashed p-5`}>
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><p className="font-display font-bold">Match Intelligence</p><span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Coming Soon</span></div>
              <ul className="mt-4 space-y-3">
                {["Match Score", "Skill Alignment", "Technology Alignment", "Experience Alignment"].map((l) => (
                  <li key={l}><div className="flex justify-between text-xs"><span>{l}</span><span className="text-muted-foreground">—</span></div><div className="mt-1 h-1.5 rounded-full bg-muted" /></li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      );
    }}</JobPageState>
  );
}

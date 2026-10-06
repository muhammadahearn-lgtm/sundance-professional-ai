import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { SearchSelect } from "@/components/ui/search-select";
import { useQuery } from "@tanstack/react-query";
import { GitCompare, X } from "lucide-react";
import type { Account } from "@/lib/account";
import { loadTaxonomy } from "@/lib/jobs-data";
import { loadCandidateJob, loadCardsByIds } from "@/lib/job-search-data";
import { COMPARE_MAX } from "@/lib/job-search";
import { Empty, card, friendlyError } from "@/components/profile/parts";
import { ARRANGEMENT, EMPLOYMENT, RequirementList, formatSalary, lbl } from "@/components/jobs/shared";
import { CompanyLogo, CompareTray, JobCard } from "./JobCard";
import { useJobLists } from "./useJobLists";
import { useAutoRecalc, useScores } from "@/components/match/Match";

export function SavedJobsPage({ account }: { account: Account }) {
  const uid = account.userId;
  const lists = useJobLists(uid);
  const tax = useQuery({ queryKey: ["taxonomy"], queryFn: loadTaxonomy, staleTime: 5 * 60_000 });
  useAutoRecalc();
  const scoreQ = useScores({ candidateId: uid });
  const ids = lists.savedIds;
  const cards = useQuery({ queryKey: ["saved-cards", ids], queryFn: () => loadCardsByIds(ids) });
  const byId = new Map((cards.data ?? []).map((c) => [c.job_id, c]));
  const unavailable = cards.data ? ids.filter((id) => !byId.has(id)) : [];
  const [co, setCo] = useState("");
  const [jobSel, setJobSel] = useState("");
  const saved = ids.map((id) => byId.get(id)).filter((x) => !!x);
  const coName = (j: (typeof saved)[number]) => (j.companies as { company_name?: string } | null)?.company_name ?? "";
  const companies = [...new Set(saved.map(coName).filter(Boolean))].sort();
  const jobOpts = saved.filter((j) => !co || coName(j) === co).map((j) => ({ value: j.job_id, label: co ? j.job_title : `${j.job_title} — ${coName(j)}` }));
  const shown = saved.filter((j) => (!co || coName(j) === co) && (!jobSel || j.job_id === jobSel));
  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-2xl font-extrabold">Saved Jobs</h1><p className="text-sm text-muted-foreground">{ids.length} saved {ids.length === 1 ? "opportunity" : "opportunities"}</p></div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <SearchSelect ariaLabel="Filter by company" className="sm:w-52" value={co} onChange={(v) => { setCo(v); setJobSel(""); }} allLabel="All companies" placeholder="Search companies..." options={companies.map((c) => ({ value: c, label: c }))} />
          <SearchSelect ariaLabel="Filter by job" className="sm:w-64" value={jobSel} onChange={setJobSel} allLabel="All jobs" placeholder="Search job titles..." options={jobOpts} />
        </div>
      </div>
      {cards.error ? <div className={`${card} p-8 text-center`}><p className="font-semibold">{friendlyError(cards.error, "Unable to load jobs.")}</p><button onClick={() => cards.refetch()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button></div>
        : cards.isLoading ? <div className="space-y-3">{[0, 1].map((i) => <div key={i} className={`${card} h-40 animate-pulse`} />)}</div>
        : !ids.length ? <Empty>You haven't saved any jobs yet. Tap Save on any job to keep it here.</Empty>
        : (
          <div className="space-y-3">
            {saved.length > 0 && !shown.length && <div className={`${card} p-8 text-center`}><p className="font-semibold">No saved jobs match these filters.</p><button onClick={() => { setCo(""); setJobSel(""); }} className="mt-4 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary">Reset filters</button></div>}
            {shown.map((j) => { const row = scoreQ.data?.find((r) => r.job_id === j.job_id); return <JobCard key={j.job_id} j={j} roleName={tax.data?.roles.find((r) => r.id === j.role_id)?.name} lists={lists} onRemove={() => lists.toggleSave(j.job_id)} score={row ? Number(row.overall_match_score) : undefined} scoreRow={row} tax={tax.data} />; })}
            {unavailable.map((id) => (
              <div key={id} className={`${card} flex items-center justify-between gap-3 p-4`}><span className="text-sm text-muted-foreground">Job no longer available</span><button onClick={() => lists.toggleSave(id)} className="text-sm font-semibold text-primary">Remove</button></div>
            ))}
          </div>
        )}
      <CompareTray lists={lists} />
    </div>
  );
}

export function CompareJobsPage({ account }: { account: Account }) {
  const lists = useJobLists(account.userId);
  const tax = useQuery({ queryKey: ["taxonomy"], queryFn: loadTaxonomy, staleTime: 5 * 60_000 });
  const ids = lists.compareIds;
  const jobs = useQuery({ queryKey: ["compare-details", ids], queryFn: () => Promise.all(ids.map((id) => loadCandidateJob(id).then((d) => ({ id, d })))) });

  if (jobs.error || tax.error) return <div className={`${card} p-8 text-center`}><p className="font-semibold">{friendlyError(jobs.error ?? tax.error, "Unable to load jobs.")}</p><button onClick={() => jobs.refetch()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button></div>;
  const t = tax.data;
  const cols = jobs.data ?? [];
  const live = cols.filter((c) => c.d);
  type Live = NonNullable<(typeof cols)[number]["d"]>;
  const rows: [string, (d: Live) => React.ReactNode][] = [
    ["Company", (d) => d.company?.company_name ?? "—"],
    ["Salary", (d) => formatSalary(d.job.minimum_salary, d.job.maximum_salary, d.job.salary_currency) || "—"],
    ["Location", (d) => d.job.location],
    ["Work Arrangement", (d) => lbl(ARRANGEMENT, d.job.work_arrangement)],
    ["Employment Type", (d) => lbl(EMPLOYMENT, d.job.employment_type)],
    ["Experience", (d) => `${d.job.minimum_years_experience}+ yrs${d.job.experience_level ? ` · ${d.job.experience_level}` : ""}`],
    ["Languages", (d) => (t ? <RequirementList items={d.languages} options={t.languages} /> : null)],
    ["Skills", (d) => (t ? <RequirementList items={d.skills} options={t.skills} /> : null)],
    ["Technologies", (d) => (t ? <RequirementList items={d.technologies} options={t.technologies} /> : null)],
    ["Benefits", (d) => <span className="whitespace-pre-line">{d.job.benefits_summary || "—"}</span>],
  ];
  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-2xl font-extrabold">Compare Jobs</h1><p className="text-sm text-muted-foreground">Compare up to {COMPARE_MAX} jobs side by side.</p></div>
        <Link to="/candidate/jobs" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary">Add more jobs</Link>
      </div>
      {jobs.isLoading || tax.isLoading ? <div className={`${card} h-96 animate-pulse`} />
        : !ids.length ? <div className={`${card} p-10 text-center`}><GitCompare className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 font-semibold">No jobs selected</p><p className="mt-1 text-sm text-muted-foreground">Tap Compare on any job to add it here.</p></div>
        : (
          <>
            {cols.filter((c) => !c.d).map((c) => (
              <div key={c.id} className={`${card} flex items-center justify-between p-4 text-sm`}><span className="text-muted-foreground">One job is no longer available.</span><button onClick={() => lists.toggleCompare(c.id)} className="font-semibold text-primary">Remove</button></div>
            ))}
            <div className={`${card} overflow-x-auto`}>
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 w-40 bg-card p-4" />
                    {live.map(({ id, d }) => (
                      <th key={id} className="min-w-[200px] border-l border-border p-4 text-left align-top font-normal">
                        <div className="flex items-start justify-between gap-2">
                          <CompanyLogo path={d!.company?.logo_url} size="h-10 w-10" />
                          <button onClick={() => lists.toggleCompare(id)} aria-label="Remove from comparison" className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-destructive"><X className="h-4 w-4" /></button>
                        </div>
                        <Link to="/candidate/jobs/$id" params={{ id }} className="mt-2 block font-display font-bold hover:text-primary">{d!.job.job_title}</Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([label, render]) => (
                    <tr key={label} className="border-t border-border">
                      <th scope="row" className="sticky left-0 bg-card p-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</th>
                      {live.map(({ id, d }) => <td key={id} className="border-l border-border p-4 align-top">{render(d!)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
    </div>
  );
}

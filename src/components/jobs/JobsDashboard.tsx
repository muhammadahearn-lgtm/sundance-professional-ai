import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Briefcase, MapPin, Plus, Users } from "lucide-react";
import { listSavedEntries } from "@/lib/talent-data";
import { SearchSelect } from "@/components/ui/search-select";
import type { Account } from "@/lib/account";
import type { JobStatus } from "@/lib/job-rules";
import { listJobs } from "@/lib/jobs-data";
import { Empty, card, friendlyError, inputCls } from "@/components/profile/parts";
import { ARRANGEMENT, StatusBadge, lbl } from "./shared";
import { JobActionBar } from "./JobActions";

const FILTERS: [JobStatus | "all", string][] = [["all", "All Jobs"], ["active", "Published"], ["draft", "Drafts"], ["paused", "Paused"], ["closed", "Closed"]];
const SORTS: [string, string][] = [["newest", "Newest"], ["oldest", "Oldest"], ["updated", "Recently Updated"], ["alpha", "Alphabetical"]];
const date = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function JobsDashboard({ account }: { account: Account }) {
  const uid = account.userId;
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["jobs", uid], queryFn: () => listJobs(uid) });
  const savedQ = useQuery({ queryKey: ["saved-entries", uid, "map"], queryFn: () => listSavedEntries(uid) });
  const sourced = (jobId: string) => (savedQ.data ?? []).filter((e) => e.job_id === jobId).length;
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const [sort, setSort] = useState("newest");
  const [co, setCo] = useState("");
  const [jobSel, setJobSel] = useState("");

  const companies = useMemo(() => {
    const m = new Map<string, { name: string; n: number }>();
    for (const j of data ?? []) {
      const id = j.company_id ?? "none";
      const e = m.get(id) ?? { name: j.companies?.company_name ?? "No company", n: 0 };
      e.n++; m.set(id, e);
    }
    return [...m.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [data]);
  const inCo = (j: { company_id: string | null }) => !co || (j.company_id ?? "none") === co;
  const jobOptions = useMemo(() => (data ?? []).filter(inCo).sort((a, b) => a.job_title.localeCompare(b.job_title)), [data, co]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    const list = (data ?? []).filter((j) => (filter === "all" || j.job_status === filter) && inCo(j) && (!jobSel || j.job_id === jobSel));
    const cmp: Record<string, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
      newest: (a, b) => b.created_at.localeCompare(a.created_at), oldest: (a, b) => a.created_at.localeCompare(b.created_at),
      updated: (a, b) => b.updated_at.localeCompare(a.updated_at), alpha: (a, b) => a.job_title.localeCompare(b.job_title),
    };
    return [...list].sort(cmp[sort]);
  }, [data, filter, sort, co, jobSel]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = (s: JobStatus | "all") => (data ?? []).filter((j) => (s === "all" || j.job_status === s) && inCo(j) && (!jobSel || j.job_id === jobSel)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-2xl font-extrabold">Jobs</h1><p className="text-sm text-muted-foreground">Create, publish and manage your open roles.</p></div>
        <Link to="/recruiter/jobs/create" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"><Plus className="h-4 w-4" />Create Job</Link>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${filter === k ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary hover:text-primary"}`}>{l} <span className="opacity-70">{count(k)}</span></button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <SearchSelect ariaLabel="Filter by company" className="sm:w-52" value={co} onChange={(v) => { setCo(v); setJobSel(""); }}
          allLabel="All companies" placeholder="Search companies..." options={companies.map(([id, c]) => ({ value: id, label: `${c.name} (${c.n})` }))} />
        <SearchSelect ariaLabel="Filter by job" className="sm:w-64" value={jobSel} onChange={setJobSel}
          allLabel="All jobs" placeholder="Search job titles..." options={jobOptions.map((j) => ({ value: j.job_id, label: co ? j.job_title : `${j.companies?.company_name ?? "No company"} — ${j.job_title}` }))} />
        <select aria-label="Sort jobs" className={`${inputCls} sm:w-48`} value={sort} onChange={(e) => setSort(e.target.value)}>{SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </div>
      </div>
      {isLoading ? <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className={`${card} h-32 animate-pulse`} />)}</div>
        : error ? <div className={`${card} p-8 text-center`}><p className="font-semibold">{friendlyError(error, "We couldn't load your jobs.")}</p><button onClick={() => refetch()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button></div>
        : !rows.length ? <Empty>{data?.length ? "No jobs match this filter." : "You haven't created any jobs yet. Click Create Job to post your first role."}</Empty>
        : (
          <ul className="space-y-3">
            {rows.map((j) => (
              <li key={j.job_id} className={`${card} p-5`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><Link to="/recruiter/jobs/$id" params={{ id: j.job_id }} className="font-display text-lg font-bold hover:text-primary">{j.job_title}</Link><StatusBadge s={j.job_status} /></div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Briefcase className="h-4 w-4" />{j.companies?.company_name ?? "—"}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{j.location} · {lbl(ARRANGEMENT, j.work_arrangement)}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{j.applications} applications</span>
                      {j.job_status !== "draft" && <Link to="/recruiter/candidates/saved" search={{ job: j.job_id }} className="inline-flex items-center gap-1 hover:text-primary"><Bookmark className="h-4 w-4" />{sourced(j.job_id)} sourced</Link>}
                    </div>
                    {j.job_status === "draft" ? (
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{j.completion_percent}% Complete</span>
                        <span className="h-1.5 w-28 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${j.completion_percent}%` }} /></span>
                        <span>Last modified {new Date(j.updated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                      </div>
                    ) : <p className="mt-1 text-xs text-muted-foreground">Created {date(j.created_at)} · Updated {date(j.updated_at)}</p>}
                  </div>
                  <JobActionBar uid={uid} id={j.job_id} status={j.job_status} applications={j.applications} compact />
                </div>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

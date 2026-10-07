import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Briefcase, CheckCircle2, Eye, GitBranch, Users } from "lucide-react";
import { Section, card } from "@/components/profile/parts";
import { SearchPicker } from "@/components/taxonomy/SearchPicker";
import { STAGES, STAGE_LABELS, filterCompanyJobs, loadCompanyJobs, summarizeCompany, type CompanyJob } from "@/lib/company-admin";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-success/15 text-success", draft: "bg-muted text-muted-foreground", paused: "bg-warning/20 text-foreground", closed: "bg-muted text-muted-foreground",
};
const STATUS_OPTIONS = [{ id: "active", name: "Active" }, { id: "draft", name: "Draft" }, { id: "paused", name: "Paused" }, { id: "closed", name: "Closed" }];

export function useCompanyJobs(companyId: string) {
  return useQuery({ queryKey: ["company-admin-jobs", companyId], queryFn: () => loadCompanyJobs(companyId) });
}

function JobTitle({ j, uid }: { j: CompanyJob; uid: string }) {
  if (j.recruiter_id !== uid) return <span className="font-semibold">{j.job_title}</span>;
  return <Link to="/recruiter/jobs/$id" params={{ id: j.job_id }} className="font-semibold hover:text-primary hover:underline">{j.job_title}</Link>;
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className={`${card} flex items-center gap-3 p-4`}>
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">{icon}</div>
      <div><p className="font-display text-2xl font-extrabold leading-none">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>
    </div>
  );
}

function ViewOnlyNote() {
  return <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Eye className="h-3.5 w-3.5" />View only — only the recruiter who posted a job can change it or its candidates.</p>;
}

function Loading() { return <div className="space-y-3">{[0, 1].map((i) => <div key={i} className={`${card} h-24 animate-pulse`} />)}</div>; }

export function AdminOverview({ companyId, teamSize, pendingRequests, onOpen }: { companyId: string; teamSize: number; pendingRequests: number; onOpen: (tab: "jobs" | "pipeline" | "team") => void }) {
  const q = useCompanyJobs(companyId);
  if (q.isLoading) return <Loading />;
  if (q.error) return <p className="text-sm text-destructive">We couldn't load company activity.</p>;
  const s = summarizeCompany(q.data ?? []);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active jobs" value={s.activeJobs} icon={<Briefcase className="h-5 w-5" />} />
        <Stat label="Applicants" value={s.applicants} icon={<Users className="h-5 w-5" />} />
        <Stat label="In pipeline" value={s.inPipeline} icon={<GitBranch className="h-5 w-5" />} />
        <Stat label="Hired" value={s.hired} icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <button onClick={() => onOpen("jobs")} className={`${card} p-4 text-left hover:border-primary`}><p className="text-sm font-semibold">{s.totalJobs} jobs</p><p className="text-xs text-muted-foreground">{s.draftJobs} draft · {s.closedJobs} closed · {s.recruiters} recruiter{s.recruiters === 1 ? "" : "s"} posting</p></button>
        <button onClick={() => onOpen("pipeline")} className={`${card} p-4 text-left hover:border-primary`}><p className="text-sm font-semibold">Hiring pipeline</p><p className="text-xs text-muted-foreground">{s.stages.interviewing} interviewing · {s.stages.offer} at offer</p></button>
        <button onClick={() => onOpen("team")} className={`${card} p-4 text-left hover:border-primary`}><p className="text-sm font-semibold">{teamSize} team member{teamSize === 1 ? "" : "s"}</p><p className="text-xs text-muted-foreground">{pendingRequests ? `${pendingRequests} admin request${pendingRequests === 1 ? "" : "s"} waiting` : "No pending admin requests"}</p></button>
      </div>
    </div>
  );
}

export function AdminJobs({ companyId, uid }: { companyId: string; uid: string }) {
  const q = useCompanyJobs(companyId);
  const [status, setStatus] = useState("");
  const [recruiter, setRecruiter] = useState("");
  const [search, setSearch] = useState("");
  const jobs = q.data ?? [];
  const recruiters = [...new Map(jobs.map((j) => [j.recruiter_id, { id: j.recruiter_id, name: j.recruiter_name }])).values()];
  const list = filterCompanyJobs(jobs, { status: status || "all", recruiter: recruiter || "all", q: search });
  return (
    <Section title="Company Jobs" icon={<Briefcase className="h-4 w-4" />}>
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <input aria-label="Search jobs" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search job titles…" className="rounded-xl border border-border bg-card px-3 py-2 text-sm" />
        <SearchPicker ariaLabel="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} placeholder="Search status…" emptyLabel="All statuses" />
        <SearchPicker ariaLabel="Recruiter" options={recruiters} value={recruiter} onChange={setRecruiter} placeholder="Search recruiters…" emptyLabel="All recruiters" />
      </div>
      {q.isLoading ? <Loading /> : q.error ? <p className="text-sm text-destructive">We couldn't load company jobs.</p> : list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{jobs.length ? "No jobs match these filters." : "No jobs have been posted for this company yet."}</p>
      ) : (
        <ul className="space-y-2">
          {list.map((j) => (
            <li key={j.job_id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm"><JobTitle j={j} uid={uid} /></p>
                <p className="text-xs text-muted-foreground">Posted by {j.recruiter_id === uid ? "you" : j.recruiter_name} · {new Date(j.published_at ?? j.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
              <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{j.applicants}</span> applicants</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[j.job_status] ?? "bg-muted"}`}>{j.job_status}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4"><ViewOnlyNote /></div>
    </Section>
  );
}

export function AdminPipeline({ companyId, uid }: { companyId: string; uid: string }) {
  const q = useCompanyJobs(companyId);
  const jobs = (q.data ?? []).filter((j) => j.job_status !== "draft");
  const s = summarizeCompany(jobs);
  const max = Math.max(1, ...STAGES.map((st) => s.stages[st]));
  return (
    <div className="space-y-6">
      <Section title="Company Hiring Funnel" icon={<GitBranch className="h-4 w-4" />}>
        {q.isLoading ? <Loading /> : (
          <div className="space-y-2">
            {STAGES.map((st) => (
              <div key={st} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs font-semibold text-muted-foreground">{STAGE_LABELS[st]}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-lg bg-muted">
                  <div className={`h-full rounded-lg ${st === "rejected" ? "bg-muted-foreground/30" : st === "hired" ? "bg-success" : "bg-primary"}`} style={{ width: `${(s.stages[st] / max) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-sm font-semibold">{s.stages[st]}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
      <Section title="Pipeline by Job" icon={<Briefcase className="h-4 w-4" />}>
        {jobs.length === 0 ? <p className="text-sm text-muted-foreground">No published jobs yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="py-2 pr-3 font-semibold">Job</th>{STAGES.map((st) => <th key={st} className="px-2 py-2 text-center font-semibold">{STAGE_LABELS[st]}</th>)}</tr></thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.job_id} className="border-t border-border">
                    <td className="py-2 pr-3"><JobTitle j={j} uid={uid} /><p className="text-xs text-muted-foreground">{j.recruiter_id === uid ? "You" : j.recruiter_name}</p></td>
                    {STAGES.map((st) => <td key={st} className={`px-2 py-2 text-center ${j[st] ? "font-semibold" : "text-muted-foreground"}`}>{j[st]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4"><ViewOnlyNote /></div>
      </Section>
    </div>
  );
}

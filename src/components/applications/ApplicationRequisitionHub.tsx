import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowRight, Briefcase, Inbox, MapPin, Search } from "lucide-react";
import { SearchSelect } from "@/components/ui/search-select";
import { card } from "@/components/profile/parts";
import { ErrorBox } from "@/components/talent/Talent";
import { listJobApplications, listPipeline } from "@/lib/applications-data";
import { useAutoRecalc, useScores } from "@/components/match/Match";
import { filterAppReqs, sortAppReqs, summarizeApplications } from "@/lib/application-requisitions";

const TABS: [string, string][] = [["active", "Open"], ["closed", "Closed"], ["all", "All"]];

function ago(d: string) {
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export function ViewToggle({ view }: { view: "hub" | "stream" }) {
  const base = "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors";
  const on = "bg-primary text-primary-foreground", off = "text-muted-foreground hover:text-foreground";
  return (
    <div role="tablist" aria-label="Applications view" className="flex rounded-xl border border-border bg-card p-1">
      <Link to="/recruiter/applications" search={{}} role="tab" aria-selected={view === "hub"} className={`${base} ${view === "hub" ? on : off}`}>By Job</Link>
      <Link to="/recruiter/applications" search={{ view: "stream" }} role="tab" aria-selected={view === "stream"} className={`${base} ${view === "stream" ? on : off}`}>All Applicants</Link>
    </div>
  );
}

export function ApplicationRequisitionHub({ uid, q, co, status }: { uid: string; q: string; co: string; status: string }) {
  const navigate = useNavigate({ from: "/recruiter/applications/" });
  const set = (p: Partial<{ q: string; co: string; status: string }>) => navigate({ search: (prev) => ({ ...prev, ...p }), replace: true });
  const apps = useQuery({ queryKey: ["job-applications", uid], queryFn: () => listJobApplications(uid) });
  const pipe = useQuery({ queryKey: ["pipeline", uid, "all"], queryFn: () => listPipeline(uid) });
  useAutoRecalc();
  const scores = useScores({});
  const all = useMemo(() => {
    const piped = new Set((pipe.data ?? []).map((p) => `${p.candidate_id}:${p.job_id}`));
    const rows = (apps.data ?? []).map((a) => ({ job_id: a.job_id, candidate_id: a.candidate_id, application_status: a.application_status, application_date: a.application_date, title: a.jobs.job_title, jobStatus: a.jobs.job_status ?? "active", location: a.jobs.location ?? "", company: a.jobs.companies?.company_name ?? "No company" }));
    return summarizeApplications(rows, (r) => piped.has(`${r.candidate_id}:${r.job_id}`), (r) => scores.data?.find((s) => s.candidate_id === r.candidate_id && s.job_id === r.job_id)?.overall_match_score ?? undefined);
  }, [apps.data, pipe.data, scores.data]);

  if (apps.error) return <ErrorBox msg="Unable To Load Applications" retry={() => apps.refetch()} />;
  const st = ["active", "closed", "all"].includes(status) ? status : "active";
  const list = sortAppReqs(filterAppReqs(all, { q, co, status: st }));
  const count = (s: string) => filterAppReqs(all, { q, co, status: s }).length;
  const companies = [...new Set(all.map((j) => j.company))].sort();
  const totalNew = filterAppReqs(all, { q: "", co: "", status: "active" }).reduce((n, j) => n + j.unreviewed, 0);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">Applications</h1>
          <p className="text-sm text-muted-foreground">{totalNew ? `${totalNew} new applicant${totalNew === 1 ? "" : "s"} waiting across your open jobs. Busiest inboxes first.` : "Pick a job to review its applicants."}</p></div>
        <ViewToggle view="hub" />
      </div>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex gap-1.5">{TABS.map(([k, l]) => <button key={k} type="button" onClick={() => set({ status: k })} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${st === k ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary hover:text-primary"}`}>{l} <span className="opacity-70">{count(k)}</span></button>)}</div>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
          <label className="relative sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => set({ q: e.target.value })} placeholder="Search jobs or companies..." aria-label="Search jobs" className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-sm" /></label>
          <SearchSelect ariaLabel="Filter by company" className="sm:w-56" value={co} onChange={(v) => set({ co: v })} allLabel="All companies" placeholder="Search companies..." options={companies.map((c) => ({ value: c, label: `${c} (${all.filter((j) => j.company === c).length})` }))} />
        </div>
      </div>
      {apps.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className={`${card} h-40 animate-pulse`} />)}</div>
        : !list.length ? <div className={`${card} p-10 text-center`}><Briefcase className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-semibold">{all.length ? "No jobs match your filters." : "No applications yet."}</p>
          {all.length ? <button type="button" onClick={() => set({ q: "", co: "", status: "active" })} className="mt-3 text-sm font-semibold text-primary hover:underline">Clear filters</button> : <p className="mt-1 text-sm text-muted-foreground">Applications to your published jobs will appear here.</p>}</div>
        : <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map((j) => (
          <li key={j.id}><Link to="/recruiter/applications" search={{ job: j.id }} className={`${card} group flex h-full flex-col p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50`}>
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-display font-bold group-hover:text-primary">{j.title}</p>
              <p className="truncate text-xs text-muted-foreground">{j.company}{j.location && <> · <MapPin className="inline h-3 w-3" /> {j.location}</>}</p></div>
              {j.status !== "active" && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{j.status}</span>}</div>
            <div className="mt-3">{j.unreviewed > 0
              ? <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-bold text-warning"><Inbox className="h-3.5 w-3.5" />{j.unreviewed} new to review</span>
              : <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-bold text-success">Inbox zero</span>}</div>
            <div className="mt-2 flex flex-wrap gap-1 text-[11px] font-semibold">
              <span className="rounded-full bg-muted px-2 py-0.5">{j.total} applicant{j.total === 1 ? "" : "s"}</span>
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary">{j.inPipeline} in pipeline</span>
              {j.archived > 0 && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{j.archived} archived</span>}
              {j.topMatch !== null && <span className="rounded-full bg-success/10 px-2 py-0.5 text-success">Top match {Math.round(j.topMatch)}%</span>}
            </div>
            <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3 text-xs"><span className="text-muted-foreground">Latest {ago(j.latest)}</span><span className="inline-flex items-center gap-1 font-semibold text-primary">{j.unreviewed ? `Review ${j.unreviewed}` : "Open"}<ArrowRight className="h-3.5 w-3.5" /></span></div>
          </Link></li>))}</ul>}
    </div>
  );
}

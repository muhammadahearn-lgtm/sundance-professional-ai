import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Briefcase, CalendarClock, MapPin, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SearchSelect } from "@/components/ui/search-select";
import { card } from "@/components/profile/parts";
import { ErrorBox } from "@/components/talent/Talent";
import { HUB_STAGES, filterHub, sortHub, summarizeJobs } from "@/lib/requisition-hub";

async function loadHub(uid: string) {
  const [jobs, rows, offers, ivs] = await Promise.all([
    supabase.from("jobs").select("job_id, job_title, job_status, location, company_id, companies(company_name)").eq("recruiter_id", uid).neq("job_status", "draft"),
    supabase.from("recruiting_pipeline").select("job_id, current_stage, pipeline_id").eq("recruiter_id", uid),
    supabase.from("job_offers").select("job_id, status, negotiated_at").eq("status", "pending"),
    supabase.from("interviews").select("pipeline_id, status, scheduled_at, duration_minutes").eq("status", "scheduled"),
  ]);
  for (const r of [jobs, rows, offers]) if (r.error) throw r.error;
  const pipeRows = rows.data ?? [];
  const stageOf = new Map(pipeRows.map((r) => [r.pipeline_id, r]));
  const scheduled: Record<string, number> = {};
  const seen = new Set<string>();
  for (const i of ivs.data ?? []) {
    const p = i.pipeline_id ? stageOf.get(i.pipeline_id) : undefined;
    if (!p?.job_id || p.current_stage !== "interviewing" || seen.has(p.pipeline_id)) continue;
    if (new Date(i.scheduled_at).getTime() + i.duration_minutes * 60000 < Date.now()) continue;
    seen.add(p.pipeline_id); scheduled[p.job_id] = (scheduled[p.job_id] ?? 0) + 1;
  }
  const list = (jobs.data ?? []).map((j) => ({ id: j.job_id, title: j.job_title, status: j.job_status, location: j.location ?? "", companyId: j.company_id ?? "", company: j.companies?.company_name ?? "No company" }));
  return summarizeJobs(list, pipeRows, offers.data ?? [], scheduled);
}

const TABS: [string, string][] = [["active", "Open"], ["closed", "Closed"], ["all", "All"]];

export function RequisitionHub({ uid, q, co, status }: { uid: string; q: string; co: string; status: string }) {
  const navigate = useNavigate({ from: "/recruiter/pipeline/" });
  const set = (p: Partial<{ q: string; co: string; status: string }>) => navigate({ search: (prev) => ({ ...prev, ...p }), replace: true });
  const hub = useQuery({ queryKey: ["requisition-hub", uid], queryFn: () => loadHub(uid) });
  if (hub.error) return <ErrorBox msg="Unable To Load Requisitions" retry={() => hub.refetch()} />;
  const all = hub.data ?? [];
  const companies = [...new Map(all.map((j) => [j.companyId, j.company])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const st = ["active", "closed", "all"].includes(status) ? status : "active";
  const rows = sortHub(filterHub(all, { q, co, status: st }));
  const count = (s: string) => filterHub(all, { q, co, status: s }).length;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">Hiring Pipelines</h1>
          <p className="text-sm text-muted-foreground">Pick a job to open its hiring board. Jobs that need your attention are listed first.</p></div>
        <Link to="/recruiter/applications" className="inline-flex h-9 items-center rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:border-primary hover:text-primary">Applications</Link>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex gap-1.5">{TABS.map(([k, l]) => <button key={k} type="button" onClick={() => set({ status: k })} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${st === k ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary hover:text-primary"}`}>{l} <span className="opacity-70">{count(k)}</span></button>)}</div>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
          <label className="relative sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => set({ q: e.target.value })} placeholder="Search jobs or companies..." aria-label="Search jobs" className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-sm" /></label>
          <SearchSelect ariaLabel="Filter by company" className="sm:w-56" value={co} onChange={(v) => set({ co: v })} allLabel="All companies" placeholder="Search companies..." options={companies.map(([id, name]) => ({ value: id, label: `${name} (${all.filter((j) => j.companyId === id).length})` }))} />
        </div>
      </div>
      {hub.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className={`${card} h-40 animate-pulse`} />)}</div>
        : !rows.length ? <div className={`${card} p-10 text-center`}><Briefcase className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-semibold">{all.length ? "No jobs match your filters." : "No published jobs yet."}</p>
          {all.length ? <button type="button" onClick={() => set({ q: "", co: "", status: "active" })} className="mt-3 text-sm font-semibold text-primary hover:underline">Clear filters</button> : <Link to="/recruiter/jobs/create" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">Create a job</Link>}</div>
        : <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map((j) => (
          <li key={j.id}><Link to="/recruiter/pipeline/$jobId" params={{ jobId: j.id }} className={`${card} group flex h-full flex-col p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50`}>
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-display font-bold group-hover:text-primary">{j.title}</p>
              <p className="truncate text-xs text-muted-foreground">{j.company}{j.location && <> · <MapPin className="inline h-3 w-3" /> {j.location}</>}</p></div>
              {j.status !== "active" && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{j.status}</span>}</div>
            <div className="mt-3 flex flex-wrap gap-1">{HUB_STAGES.map(([k, l]) => <span key={k} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${j.stages[k] ? (k === "hired" ? "bg-success/10 text-success" : "bg-primary-soft text-primary") : "bg-muted text-muted-foreground/70"}`}>{l} {j.stages[k] ?? 0}</span>)}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {j.negotiating > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning"><AlertCircle className="h-3 w-3" />{j.negotiating} offer negotiating</span>}
              {j.pendingOffers - j.negotiating > 0 && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">{j.pendingOffers - j.negotiating} offer pending</span>}
              {j.needsSchedule > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning"><CalendarClock className="h-3 w-3" />{j.needsSchedule} to schedule</span>}
            </div>
            <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3 text-xs"><span className="text-muted-foreground">{j.total} active candidate{j.total === 1 ? "" : "s"}</span><span className="inline-flex items-center gap-1 font-semibold text-primary">Open Pipeline<ArrowRight className="h-3.5 w-3.5" /></span></div>
          </Link></li>))}</ul>}
    </div>
  );
}

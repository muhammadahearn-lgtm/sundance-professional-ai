import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, Trash2 } from "lucide-react";
import { listJobApplications, listPipeline, moveStage, removeFromPipeline, type PipelineCard } from "@/lib/applications-data";
import { loadJob } from "@/lib/jobs-data";
import { STAGES, type Stage } from "@/lib/talent-rules";
import { card, friendlyError } from "@/components/profile/parts";
import { ARRANGEMENT, lbl } from "@/components/jobs/shared";
import { Avatar, Chips, ErrorBox, btn, useTaxonomy } from "@/components/talent/Talent";

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const MSG: Partial<Record<Stage, string>> = { rejected: "Candidate Rejected", offer: "Offer Extended", hired: "Candidate Hired" };

export function PipelinePage({ uid, jobId }: { uid: string; jobId?: string | undefined }) {
  const qc = useQueryClient();
  const tax = useTaxonomy();
  const q = useQuery({ queryKey: ["pipeline", uid, jobId ?? "all"], queryFn: () => listPipeline(uid, jobId) });
  const apps = useQuery({ queryKey: ["job-applications", uid], queryFn: () => listJobApplications(uid) });
  const job = useQuery({ queryKey: ["job-basic", jobId], queryFn: () => loadJob(jobId!), enabled: !!jobId });
  const navigate = useNavigate();
  const [drag, setDrag] = useState<string | null>(null);

  async function move(c: PipelineCard, stage: Stage) {
    if (c.current_stage === stage) return;
    const key = ["pipeline", uid, jobId ?? "all"];
    qc.setQueryData<PipelineCard[]>(key, (p = []) => p.map((x) => (x.pipeline_id === c.pipeline_id ? { ...x, current_stage: stage, stage_date: new Date().toISOString() } : x)));
    try { await moveStage(c, stage); toast.success(MSG[stage] ?? "Candidate Advanced"); } catch (e) { toast.error(friendlyError(e, "Unable To Update Pipeline")); }
    qc.invalidateQueries({ queryKey: ["pipeline"] }); qc.invalidateQueries({ queryKey: ["job-applications"] });
  }
  async function remove(c: PipelineCard) {
    if (!confirm(`Remove ${c.name} from the pipeline?`)) return;
    try { await removeFromPipeline(c.pipeline_id); toast.success("Candidate removed"); } catch (e) { toast.error(friendlyError(e, "Unable To Update Pipeline")); }
    qc.invalidateQueries({ queryKey: ["pipeline"] });
  }

  if (q.error) return <ErrorBox msg="Unable To Update Pipeline" retry={() => q.refetch()} />;
  const cards = q.data ?? [];
  const appRows = (apps.data ?? []).filter((a) => !jobId || a.job_id === jobId);
  const n = (s: string) => cards.filter((c) => c.current_stage === s).length;
  const metrics: [string, number | string][] = [["Applications Received", appRows.length], ["Candidates Contacted", n("contacted")], ["Candidates Interviewing", n("interviewing") + n("shortlisted")], ["Offers Extended", n("offer")], ["Hires Made", n("hired")], ["Fill Rate", "Coming Soon"]];
  const activity = [...cards].sort((a, b) => b.stage_date.localeCompare(a.stage_date)).slice(0, 6);
  const j = job.data?.job;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>{jobId && <Link to="/recruiter/pipeline" className="text-sm text-muted-foreground hover:text-primary">← All pipelines</Link>}
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{j ? `${j.job_title} Pipeline` : "Recruiting Pipeline"}</h1>
          <p className="text-sm text-muted-foreground">{j ? `${j.location} · ${lbl(ARRANGEMENT, j.work_arrangement)} · ${cards.length} candidates` : "Drag candidates between stages to update their progress."}</p></div>
        <div className="flex gap-2"><Link to="/recruiter/applications" className={btn}>Applications</Link>
          <select value={jobId ?? ""} onChange={(e) => { if (e.target.value) navigate({ to: "/recruiter/pipeline/$jobId", params: { jobId: e.target.value } }); else navigate({ to: "/recruiter/pipeline" }); }} aria-label="Filter by job" className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
            <option value="">All jobs</option>{[...new Map((apps.data ?? []).map((a) => [a.job_id, a.jobs.job_title])).entries()].map(([id, t]) => <option key={id} value={id}>{t}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{metrics.map(([l, v]) => <div key={l} className={`${card} p-4`}><p className={`font-display font-extrabold ${typeof v === "number" ? "text-2xl" : "text-sm text-muted-foreground"}`}>{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>)}</div>

      {q.isLoading || !tax.data ? <div className={`${card} h-72 animate-pulse`} /> : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2"><div className="flex gap-4" style={{ minWidth: STAGES.length * 260 }}>
          {STAGES.map(([key, title]) => {
            const col = cards.filter((c) => c.current_stage === key);
            return (
              <section key={key} onDragOver={(e) => e.preventDefault()} onDrop={() => { const c = cards.find((x) => x.pipeline_id === drag); if (c) move(c, key as Stage); setDrag(null); }}
                className={`w-64 shrink-0 rounded-2xl border border-border bg-muted/40 p-3 ${drag ? "ring-1 ring-primary/30" : ""}`} aria-label={`${title} column`}>
                <div className="mb-3 flex items-center justify-between px-1"><h2 className="text-sm font-bold">{title}</h2><span className="rounded-full bg-card px-2 text-xs font-semibold">{col.length}</span></div>
                <div className="min-h-24 space-y-3">{col.map((c) => (
                  <article key={c.pipeline_id} draggable onDragStart={() => setDrag(c.pipeline_id)} onDragEnd={() => setDrag(null)} className={`${card} cursor-grab p-3 active:cursor-grabbing`}>
                    <div className="flex items-start gap-2"><Avatar name={c.name} size="h-8 w-8 text-xs" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{c.name}</p><p className="truncate text-xs text-muted-foreground">{c.candTitle} · {c.years}y</p></div>
                      <button onClick={() => remove(c)} aria-label={`Remove ${c.name}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div>
                    {!jobId && c.jobs?.job_title && <p className="mt-2 truncate text-[11px] text-muted-foreground">{c.jobs.job_title}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">{c.appDate ? `Applied ${fmt(c.appDate)}` : "Sourced"} · Match: Coming Soon</p>
                    <div className="mt-2"><Chips ids={c.skills} opts={tax.data!.skills} max={3} /></div>
                    <div className="mt-3 flex items-center gap-1.5">
                      {c.applicationId ? <Link to="/recruiter/applications/$id" params={{ id: c.applicationId }} className="text-xs font-semibold text-primary">View</Link> : <Link to="/recruiter/candidates/$id" params={{ id: c.candidate_id }} className="text-xs font-semibold text-primary">View</Link>}
                      <select value={c.current_stage} onChange={(e) => move(c, e.target.value as Stage)} aria-label={`Move ${c.name}`} className="ml-auto rounded-lg border border-input bg-background px-1.5 py-1 text-xs">{STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                    </div>
                  </article>))}
                  {!col.length && <p className="px-1 py-6 text-center text-xs text-muted-foreground">Drop candidates here</p>}</div>
              </section>
            );
          })}
        </div></div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`${card} p-5`}><p className="font-display font-bold">Hiring Activity</p>
          {activity.length ? <ul className="mt-3 space-y-2 text-sm">{activity.map((c) => <li key={c.pipeline_id} className="flex justify-between gap-2"><span><strong>{c.name}</strong> moved to {STAGES.find(([k]) => k === c.current_stage)?.[1]}</span><span className="text-xs text-muted-foreground">{fmt(c.stage_date)}</span></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No activity yet. Move applicants into the pipeline to start tracking.</p>}</div>
        <div className={`${card} border-dashed p-5`}><div className="flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /><p className="font-display font-bold">Application Alerts</p><span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Coming Soon</span></div>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground"><li>New Applications</li><li>Application Updates</li><li>Pipeline Changes</li></ul></div>
      </div>
    </div>
  );
}

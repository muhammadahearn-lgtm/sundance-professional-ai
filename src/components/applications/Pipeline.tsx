import { MessageButton } from "@/components/messages/Messages";
import { SearchSelect } from "@/components/ui/search-select";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { listJobApplications, listPipeline, moveStage, removeFromPipeline, type PipelineCard } from "@/lib/applications-data";
import { listMyJobsWithCompany, loadJob } from "@/lib/jobs-data";
import { STAGES, type Stage } from "@/lib/talent-rules";
import { card, friendlyError } from "@/components/profile/parts";
import { ARRANGEMENT, lbl } from "@/components/jobs/shared";
import { MatchBadge, MatchFilter, useScores } from "@/components/match/Match";
import { meetsMinMatch } from "@/lib/match-engine";
import { Avatar, Chips, ErrorBox, btn, useTaxonomy } from "@/components/talent/Talent";

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const miniBtn = "inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-muted/80 hover:text-primary disabled:opacity-50";
const MSG: Partial<Record<Stage, string>> = { rejected: "Candidate Rejected", offer: "Offer Extended", hired: "Candidate Hired" };

export function PipelinePage({ uid, jobId }: { uid: string; jobId?: string | undefined }) {
  const qc = useQueryClient();
  const tax = useTaxonomy();
  const q = useQuery({ queryKey: ["pipeline", uid, jobId ?? "all"], queryFn: () => listPipeline(uid, jobId) });
  const apps = useQuery({ queryKey: ["job-applications", uid], queryFn: () => listJobApplications(uid) });
  const job = useQuery({ queryKey: ["job-basic", jobId], queryFn: () => loadJob(jobId!), enabled: !!jobId });
  const jobsQ = useQuery({ queryKey: ["my-jobs-company", uid], queryFn: () => listMyJobsWithCompany(uid) });
  const [co, setCo] = useState("");
  const navigate = useNavigate();
  const [drag, setDrag] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: number) => boardRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  const edgeScroll = (e: React.DragEvent) => {
    const el = boardRef.current; if (!el || !drag) return;
    const r = el.getBoundingClientRect(); const edge = 80;
    if (e.clientX > r.right - edge) el.scrollLeft += 18;
    else if (e.clientX < r.left + edge) el.scrollLeft -= 18;
  };
  const [mm, setMm] = useState(0);
  const scores = useScores({});
  const scoreOf = (c: PipelineCard) => {
    const rows = (scores.data ?? []).filter((r) => r.candidate_id === c.candidate_id && (!c.job_id || r.job_id === c.job_id));
    return rows.length ? Math.max(...rows.map((r) => Number(r.overall_match_score))) : undefined;
  };

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
  const myJobs = jobsQ.data ?? [];
  const companies = [...new Map(myJobs.map((j) => [j.companyId, j.company])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const coSel = jobId ? myJobs.find((j) => j.id === jobId)?.companyId ?? co : co;
  const inCo = (jid: string | null) => !coSel || myJobs.find((j) => j.id === jid)?.companyId === coSel;
  const cards = (q.data ?? []).filter((c) => inCo(c.job_id));
  const appRows = (apps.data ?? []).filter((a) => (!jobId || a.job_id === jobId) && inCo(a.job_id));
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
        <div className="flex flex-wrap gap-2"><Link to="/recruiter/applications" className={btn}>Applications</Link>
          <SearchSelect ariaLabel="Filter by company" className="w-52" value={coSel} onChange={(v) => { setCo(v); if (jobId) navigate({ to: "/recruiter/pipeline" }); }}
            allLabel="All companies" placeholder="Search companies..." options={companies.map(([id, name]) => ({ value: id, label: name }))} />
          <SearchSelect ariaLabel="Filter by job" className="w-64" value={jobId ?? ""} onChange={(v) => { if (v) navigate({ to: "/recruiter/pipeline/$jobId", params: { jobId: v } }); else navigate({ to: "/recruiter/pipeline" }); }}
            allLabel="All jobs" placeholder="Search job titles..." options={myJobs.filter((j) => !coSel || j.companyId === coSel).map((j) => ({ value: j.id, label: coSel ? j.title : `${j.company} — ${j.title}` }))} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{metrics.map(([l, v]) => <div key={l} className={`${card} p-4`}><p className={`font-display font-extrabold ${typeof v === "number" ? "text-2xl" : "text-sm text-muted-foreground"}`}>{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>)}</div>

      <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Match</span><MatchFilter value={mm} onChange={setMm} />
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => scrollBy(-1)} aria-label="Scroll pipeline left" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => scrollBy(1)} aria-label="Scroll pipeline right" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
        </div></div>
      {tax.error ? <ErrorBox msg="Unable To Load Pipeline" retry={() => tax.refetch()} /> : q.isLoading || !tax.data ? <div className={`${card} h-72 animate-pulse`} /> : (
        <div ref={boardRef} onDragOver={edgeScroll} className="pipeline-scroll -mx-4 overflow-x-scroll px-4 pb-3"><div className="flex gap-4" style={{ minWidth: STAGES.length * 260 }}>
          {STAGES.map(([key, title]) => {
            const col = cards.filter((c) => c.current_stage === key && meetsMinMatch(scoreOf(c), mm));
            return (
              <section key={key} onDragOver={(e) => e.preventDefault()} onDrop={() => { const c = cards.find((x) => x.pipeline_id === drag); if (c) move(c, key as Stage); setDrag(null); }}
                className={`w-64 shrink-0 rounded-2xl border border-border bg-muted/40 p-3 ${drag ? "ring-1 ring-primary/30" : ""}`} aria-label={`${title} column`}>
                <div className="mb-3 flex items-center justify-between px-1"><h2 className="text-sm font-bold">{title}</h2><span className="rounded-full bg-card px-2 text-xs font-semibold">{col.length}</span></div>
                <div className="min-h-24 space-y-3">{col.map((c) => (
                  <article key={c.pipeline_id} draggable onDragStart={() => setDrag(c.pipeline_id)} onDragEnd={() => setDrag(null)} className={`${card} cursor-grab p-3 active:cursor-grabbing`}>
                    <div className="flex items-start gap-2">{(() => { const inner = <><Avatar name={c.name} size="h-8 w-8 text-xs" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold group-hover:text-primary group-hover:underline">{c.name}</p><p className="truncate text-xs text-muted-foreground">{c.candTitle} · {c.years}y</p></div></>; const cls = "group flex min-w-0 flex-1 items-start gap-2 rounded-lg"; return c.applicationId ? <Link to="/recruiter/applications/$id" params={{ id: c.applicationId }} className={cls} aria-label={`View ${c.name}`}>{inner}</Link> : <Link to="/recruiter/candidates/$id" params={{ id: c.candidate_id }} className={cls} aria-label={`View ${c.name}`}>{inner}</Link>; })()}
                      <button onClick={() => remove(c)} aria-label={`Remove ${c.name}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div>
                    {!jobId && c.jobs?.job_title && <p className="mt-2 truncate text-[11px] text-muted-foreground">{c.jobs.job_title}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">{c.appDate ? `Applied ${fmt(c.appDate)}` : "Sourced"}</p>
                    <div className="mt-1"><MatchBadge score={scoreOf(c)} /></div>
                    <div className="mt-2"><Chips ids={c.skills} opts={tax.data!.skills} max={3} /></div>
                    <div className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-2.5">
                      <MessageButton role="recruiter" candidateId={c.candidate_id} jobId={c.job_id} label="Message" className={`${miniBtn} shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5`} />
                      <select value={c.current_stage} onChange={(e) => move(c, e.target.value as Stage)} aria-label={`Move ${c.name}`} className="h-7 min-w-0 flex-1 rounded-lg border border-input bg-card px-2 text-xs font-semibold hover:border-primary">{STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
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

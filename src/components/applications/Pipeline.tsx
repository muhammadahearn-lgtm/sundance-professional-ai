import { MessageButton } from "@/components/messages/Messages";
import { SearchSelect } from "@/components/ui/search-select";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Bell, CalendarClock, ChevronLeft, ChevronRight, Sparkles, Trash2 } from "lucide-react";
import { listJobApplications, listPipeline, moveStage, removeFromPipeline, type PipelineCard } from "@/lib/applications-data";
import { listRecruiterInterviews } from "@/lib/interviews-data";
import { InterviewPill, ScheduleInterviewDialog } from "@/components/applications/Interviews";
import { fmtInterview } from "@/lib/interview-rules";
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

  const ivQ = useQuery({ queryKey: ["interviews", uid], queryFn: () => listRecruiterInterviews(uid) });
  const roundsOf = (c: PipelineCard) => (ivQ.data ?? []).filter((i) => i.pipeline_id === c.pipeline_id || (!!c.applicationId && i.application_id === c.applicationId));
  /** The candidate's upcoming interview, if any (finished rounds don't count). */
  const ivOf = (c: PipelineCard) => roundsOf(c).find((i) => i.status === "scheduled" && new Date(i.scheduled_at).getTime() + i.duration_minutes * 60000 > Date.now());
  const doneRounds = (c: PipelineCard) => roundsOf(c).length;
  const [sched, setSched] = useState<PipelineCard | null>(null);

  async function move(c: PipelineCard, stage: Stage) {
    if (c.current_stage === stage) return;
    const key = ["pipeline", uid, jobId ?? "all"];
    qc.setQueryData<PipelineCard[]>(key, (p = []) => p.map((x) => (x.pipeline_id === c.pipeline_id ? { ...x, current_stage: stage, stage_date: new Date().toISOString() } : x)));
    try { await moveStage(c, stage); toast.success(MSG[stage] ?? "Candidate Advanced"); if (stage === "interviewing" && !ivOf(c)) setSched({ ...c, current_stage: stage }); } catch (e) { toast.error(friendlyError(e, "Unable To Update Pipeline")); }
    qc.invalidateQueries({ queryKey: ["pipeline"] }); qc.invalidateQueries({ queryKey: ["job-applications"] });
  }
  const NEXT: Partial<Record<Stage, [Stage, string]>> = { saved: ["contacted", "Mark Contacted"], interviewing: ["shortlisted", "Shortlist"], shortlisted: ["offer", "Extend Offer"], offer: ["hired", "Mark Hired"] };
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
  const metrics: [string, number][] = [["Applications", appRows.length], ["Contacted", n("contacted")], ["Interviewing", n("interviewing") + n("shortlisted")], ["Offers", n("offer")], ["Hires", n("hired")]];
  const activity = [...cards].sort((a, b) => b.stage_date.localeCompare(a.stage_date)).slice(0, 6);
  const j = job.data?.job;
  const cardIds = new Set(cards.map((c) => c.pipeline_id));
  const upcoming = (ivQ.data ?? []).filter((i) => i.status === "scheduled" && i.pipeline_id && cardIds.has(i.pipeline_id) && new Date(i.scheduled_at).getTime() > Date.now() - 3600000);
  const needsSchedule = cards.filter((c) => c.current_stage === "interviewing" && !ivOf(c));
  const brief = [
    `${cards.length} candidate${cards.length === 1 ? "" : "s"} in this pipeline, ${n("interviewing") + n("shortlisted")} in interview stages.`,
    upcoming.length ? `Next interview: ${cards.find((c) => c.pipeline_id === upcoming[0]!.pipeline_id)?.name} on ${fmtInterview(upcoming[0]!.scheduled_at)}.` : "No interviews scheduled yet.",
    needsSchedule.length ? `${needsSchedule.map((c) => c.name).slice(0, 2).join(" and ")} ${needsSchedule.length === 1 ? "is" : "are"} in Interviewing without a scheduled time.` : n("offer") ? `${n("offer")} offer${n("offer") === 1 ? "" : "s"} waiting on a decision.` : "Everyone in Interviewing has a time booked.",
  ];
  const nameOfPipe = (pid: string | null) => cards.find((c) => c.pipeline_id === pid)?.name ?? "Candidate";

  return (
    <div className="space-y-6 pb-10">
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary-soft via-card to-card p-5 shadow-soft sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">{jobId && <Link to="/recruiter/pipeline" className="text-sm text-muted-foreground hover:text-primary">← All pipelines</Link>}
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/80 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>AI pipeline active</span>
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{j ? `${j.job_title} Pipeline` : "Hiring Pipeline"}</h1>
            <p className="text-sm text-muted-foreground">{j ? `${j.location} · ${lbl(ARRANGEMENT, j.work_arrangement)}` : "Drag candidates between stages. Moving someone to Interviewing lets you book the interview."}</p></div>
          <div className="flex flex-wrap gap-2"><Link to="/recruiter/applications" className={btn}>Applications</Link>
            <SearchSelect ariaLabel="Filter by company" className="w-52" value={coSel} onChange={(v) => { setCo(v); if (jobId) navigate({ to: "/recruiter/pipeline" }); }}
              allLabel="All companies" placeholder="Search companies..." options={companies.map(([id, name]) => ({ value: id, label: name }))} />
            <SearchSelect ariaLabel="Filter by job" className="w-64" value={jobId ?? ""} onChange={(v) => { if (v) navigate({ to: "/recruiter/pipeline/$jobId", params: { jobId: v } }); else navigate({ to: "/recruiter/pipeline" }); }}
              allLabel="All jobs" placeholder="Search job titles..." options={myJobs.filter((j) => !coSel || j.companyId === coSel).map((j) => ({ value: j.id, label: coSel ? j.title : `${j.company} — ${j.title}` }))} /></div>
        </div>
        <div className="relative mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
          <ul className="space-y-1.5 text-sm">{brief.map((b) => <li key={b} className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{b}</li>)}</ul>
          <div className="flex flex-wrap items-center gap-1.5">{metrics.map(([l, v], i) => <div key={l} className="flex items-center gap-1.5"><div className="rounded-xl border border-border bg-card/90 px-3 py-2 text-center"><p className="font-display text-xl font-extrabold">{v}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{l}</p></div>{i < metrics.length - 1 && <ChevronRight className="h-4 w-4 text-primary/50" />}</div>)}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Match</span><MatchFilter value={mm} onChange={setMm} />
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => scrollBy(-1)} aria-label="Scroll pipeline left" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card hover:border-primary hover:text-primary"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => scrollBy(1)} aria-label="Scroll pipeline right" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card hover:border-primary hover:text-primary"><ChevronRight className="h-4 w-4" /></button>
        </div></div>
      {tax.error ? <ErrorBox msg="Unable To Load Pipeline" retry={() => tax.refetch()} /> : q.isLoading || !tax.data ? <div className={`${card} h-72 animate-pulse`} /> : (
        <div ref={boardRef} onDragOver={edgeScroll} className="pipeline-scroll -mx-4 overflow-x-scroll px-4 pb-3"><div className="flex gap-4" style={{ minWidth: STAGES.length * 276 }}>
          {STAGES.map(([key, title], si) => {
            const col = cards.filter((c) => c.current_stage === key && meetsMinMatch(scoreOf(c), mm));
            const tone = key === "hired" ? "bg-success" : key === "rejected" ? "bg-destructive" : "bg-gradient-primary";
            return (
              <section key={key} onDragOver={(e) => e.preventDefault()} onDrop={() => { const c = cards.find((x) => x.pipeline_id === drag); if (c) move(c, key as Stage); setDrag(null); }}
                className={`w-[16.5rem] shrink-0 rounded-2xl border bg-card/60 p-3 backdrop-blur-sm transition-all ${drag ? "border-primary/40 ring-2 ring-primary/15" : "border-border"}`} aria-label={`${title} column`}>
                <div className={`mb-3 h-1 rounded-full ${tone} ${key === "rejected" ? "opacity-60" : ""}`} style={key === "rejected" || key === "hired" ? undefined : { opacity: 0.35 + si * 0.12 }} />
                <div className="mb-3 flex items-center justify-between px-1"><h2 className="text-sm font-bold">{title}</h2><span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">{col.length}</span></div>
                <div className="min-h-24 space-y-3">{col.map((c) => {
                  const iv = ivOf(c); const next = NEXT[c.current_stage as Stage];
                  return (
                  <article key={c.pipeline_id} draggable onDragStart={() => setDrag(c.pipeline_id)} onDragEnd={() => setDrag(null)} className={`${card} cursor-grab p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 active:cursor-grabbing ${drag === c.pipeline_id ? "opacity-50" : ""}`}>
                    <div className="flex items-start gap-2">{(() => { const inner = <><Avatar name={c.name} size="h-9 w-9 text-xs ring-2 ring-primary/30 ring-offset-1 ring-offset-card" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold group-hover:text-primary group-hover:underline">{c.name}</p><p className="truncate text-xs text-muted-foreground">{c.candTitle} · {c.years}y</p></div></>; const cls = "group flex min-w-0 flex-1 items-start gap-2 rounded-lg"; return c.applicationId ? <Link to="/recruiter/applications/$id" params={{ id: c.applicationId }} className={cls} aria-label={`View ${c.name}`}>{inner}</Link> : <Link to="/recruiter/candidates/$id" params={{ id: c.candidate_id }} className={cls} aria-label={`View ${c.name}`}>{inner}</Link>; })()}
                      <button onClick={() => remove(c)} aria-label={`Remove ${c.name}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div>
                    <div className="mt-2 flex items-center justify-between gap-2"><MatchBadge score={scoreOf(c)} /><span className="text-[11px] text-muted-foreground">{c.appDate ? `Applied ${fmt(c.appDate)}` : "Sourced"}</span></div>
                    {!jobId && c.jobs?.job_title && <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{c.jobs.job_title}</p>}
                    <div className="mt-2"><Chips ids={c.skills} opts={tax.data!.skills} max={3} /></div>
                    {iv ? <div className="mt-2"><InterviewPill i={iv} onClick={() => setSched(c)} /></div>
                      : ["contacted", "interviewing", "shortlisted"].includes(c.current_stage) && <button type="button" onClick={() => setSched(c)} className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed px-2 py-1 text-[11px] font-semibold transition-colors hover:border-primary hover:text-primary ${c.current_stage === "interviewing" ? "border-warning/60 text-warning" : "border-border text-muted-foreground"}`}><CalendarClock className="h-3 w-3" />{doneRounds(c) ? `Schedule Round ${Math.max(...roundsOf(c).map((r) => r.round_number ?? 1)) + 1}` : "Schedule interview"}</button>}
                    {!iv && doneRounds(c) > 0 && <p className="mt-1 text-center text-[10px] font-semibold text-muted-foreground">{doneRounds(c)} round{doneRounds(c) === 1 ? "" : "s"} completed</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2.5">
                      <MessageButton role="recruiter" candidateId={c.candidate_id} jobId={c.job_id} label="Message" className={`${miniBtn} shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5`} />
                      {next ? <button type="button" onClick={() => move(c, next[0])} className={`${miniBtn} min-w-0 flex-1 justify-center`}>{next[1]}<ArrowRight className="h-3 w-3" /></button> : <span className="flex-1" />}
                      <select value={c.current_stage} onChange={(e) => move(c, e.target.value as Stage)} aria-label={`Move ${c.name}`} title="Move to stage" className="h-7 w-full rounded-lg border border-input bg-card px-1 text-xs font-semibold hover:border-primary">{STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                    </div>
                  </article>); })}
                  {!col.length && <p className="rounded-xl border border-dashed border-border px-1 py-6 text-center text-xs text-muted-foreground">Drop candidates here</p>}</div>
              </section>
            );
          })}
        </div></div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`${card} p-5`}><div className="flex items-center gap-2"><span className="h-4 w-1 rounded-full bg-gradient-primary" /><p className="font-display font-bold">Upcoming Interviews</p></div>
          {upcoming.length ? <ul className="mt-3 space-y-2">{upcoming.slice(0, 6).map((i) => <li key={i.interview_id} className="flex items-center gap-3 rounded-xl border border-border p-2.5"><CalendarClock className="h-4 w-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{nameOfPipe(i.pipeline_id)}</p><p className="truncate text-xs text-muted-foreground">{fmtInterview(i.scheduled_at)} · {i.format === "online" ? "Online" : i.location_address}</p></div>{i.format === "online" && <a href={i.meeting_url} target="_blank" rel="noreferrer" className={miniBtn}>Join</a>}</li>)}</ul>
            : <p className="mt-2 text-sm text-muted-foreground">No interviews booked. Move a candidate to Interviewing to schedule one.</p>}</div>
        <div className={`${card} p-5`}><div className="flex items-center gap-2"><span className="h-4 w-1 rounded-full bg-gradient-primary" /><p className="font-display font-bold">Hiring Activity</p><Bell className="ml-auto h-4 w-4 text-muted-foreground" /></div>
          {activity.length ? <ul className="mt-3 space-y-2 text-sm">{activity.map((c) => <li key={c.pipeline_id} className="flex justify-between gap-2"><span><strong>{c.name}</strong> moved to {STAGES.find(([k]) => k === c.current_stage)?.[1]}</span><span className="text-xs text-muted-foreground">{fmt(c.stage_date)}</span></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No activity yet. Move applicants into the pipeline to start tracking.</p>}</div>
      </div>

      {sched && <ScheduleInterviewDialog key={sched.pipeline_id} open onOpenChange={(o) => !o && setSched(null)} candidateName={sched.name} existing={ivOf(sched)} priorRounds={roundsOf(sched)}
        ctx={{ uid, candidateId: sched.candidate_id, jobId: sched.job_id, pipelineId: sched.pipeline_id, applicationId: sched.applicationId }}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["interviews"] }); qc.invalidateQueries({ queryKey: ["my-interviews"] }); }} />}
    </div>
  );
}

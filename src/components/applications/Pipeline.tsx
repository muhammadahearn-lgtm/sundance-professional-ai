import { listReferenceBadges } from "@/lib/reference-badges";
import { referenceProgress } from "@/lib/references";
import { MessageButton } from "@/components/messages/Messages";
import { SearchSelect } from "@/components/ui/search-select";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Bell, CalendarClock, Check, ClipboardCheck, ChevronLeft, ChevronRight, GitCompare, Send, Sparkles, Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { shareCompareWithTeam } from "@/lib/hiring-team.functions";
import { listComparedCandidates, setComparedCandidate } from "@/lib/talent-data";

const SELECT_MAX = 4;

async function listTeamRecommendations() {
  const { data, error } = await supabase.from("team_recommendations").select("job_id, candidate_id, kind, note, job_stakeholders(name, hiring_role)");
  if (error) throw error;
  return data ?? [];
}
import { listJobApplications, listPipeline, moveStage, type PipelineCard } from "@/lib/applications-data";
import { cancelInterview, listRecruiterInterviews } from "@/lib/interviews-data";
import { ScheduleInterviewDialog, ScorecardDialog } from "@/components/applications/Interviews";
import { RoundStepper, ShortlistSummary } from "@/components/applications/RoundStepper";
import { normalizePlan, roundProgress, FOLLOW_UP_PLAN, interviewPerformance, compareByInterview } from "@/lib/interview-plan";
import { listMyScorecards, type Interview } from "@/lib/interviews-data";
import { fmtInterview } from "@/lib/interview-rules";
import { listMyJobsWithCompany, loadJob } from "@/lib/jobs-data";
import { STAGES, stageAge, type Stage } from "@/lib/talent-rules";
/** Board columns — sourced talent lives in Saved Candidates, so the pipeline starts at Contacted. */
const BOARD_STAGES = STAGES.filter(([k]) => k !== "saved");
import { isSilverEligible } from "@/lib/saved-candidates";
import { listSavedEntries, markSilverMedalists } from "@/lib/talent-data";
import { RenegeDialog, FastTrackDialog } from "@/components/applications/RenegeDialog";
import { canReportRenege, fastTrackCandidates, renegeReasonLabel } from "@/lib/renege";
import { NotMovingForwardDialog } from "@/components/applications/NotMovingForwardDialog";
import { scheduleRejection, sendRejectionNow, isRejectionPending } from "@/lib/rejection-delivery";
import { HireDialog, OfferDialog, OfferPill } from "@/components/applications/Offers";
import { latestOffer, withdrawOffer, type Offer } from "@/lib/offers-data";
import { canMoveCard, canUndoMove, hireCheck, moveToast, needsOfferWithdrawal, shouldAutoSchedule, skippedStages } from "@/lib/stage-moves";
import { formatSalaryAmount } from "@/lib/salary";
import { withdrawReasonLabel } from "@/lib/withdrawal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { card, friendlyError } from "@/components/profile/parts";
import { ARRANGEMENT, lbl } from "@/components/jobs/shared";
import { MatchBadge, MatchFilter, useScores } from "@/components/match/Match";
import { meetsMinMatch } from "@/lib/match-engine";
import { Avatar, ErrorBox, btn, useTaxonomy } from "@/components/talent/Talent";

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const miniBtn = "inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-muted/80 hover:text-primary disabled:opacity-50";
const MSG: Partial<Record<Stage, string>> = { rejected: "Marked Not Moving Forward", offer: "Offer Extended", hired: "Candidate Hired" };

export function PipelinePage({ uid, jobId, focus }: { uid: string; jobId?: string | undefined; focus?: string | undefined }) {
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
  const recsQ = useQuery({ queryKey: ["team-recommendations", uid], queryFn: listTeamRecommendations });
  const picksOf = (c: PipelineCard) => (recsQ.data ?? []).filter((r) => r.kind === "recommend" && r.candidate_id === c.candidate_id && r.job_id === c.job_id);
  const roundsOf = (c: PipelineCard) => (ivQ.data ?? []).filter((i) => i.pipeline_id === c.pipeline_id || (!!c.applicationId && i.application_id === c.applicationId));
  /** The candidate's upcoming interview, if any (finished rounds don't count). */
  const ivOf = (c: PipelineCard) => roundsOf(c).find((i) => i.status === "scheduled" && new Date(i.scheduled_at).getTime() + i.duration_minutes * 60000 > Date.now());
  const scQ = useQuery({ queryKey: ["scorecards", uid], queryFn: () => listMyScorecards(uid) });
  const planOf = (c: PipelineCard) => normalizePlan((c.jobs as { interview_plan?: unknown } | null)?.interview_plan);
  const stepsOf = (c: PipelineCard) => roundProgress(planOf(c), roundsOf(c), scQ.data ?? []);
  const perfOf = (c: PipelineCard) => interviewPerformance(stepsOf(c));
  const [sortMode, setSortMode] = useState<"auto" | "interview" | "match" | "workflow">("auto");
  const [scoreFor, setScoreFor] = useState<{ c: PipelineCard; i: Interview } | null>(null);
  const [editIv, setEditIv] = useState<Interview | undefined>(undefined);
  const [followUp, setFollowUp] = useState(false);
  const [sched, setSched] = useState<PipelineCard | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const focused = useRef(false);
  useEffect(() => {
    if (!focus || focused.current || !q.data) return;
    const el = document.querySelector<HTMLElement>(`[data-candidate="${focus}"]`);
    if (!el) return;
    focused.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    setFlash(focus);
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [focus, q.data, tax.data]);
  const [sel, setSel] = useState<PipelineCard[]>([]);
  const [busy, setBusy] = useState<"" | "compare" | "share">("");
  const share = useServerFn(shareCompareWithTeam);
  const isSel = (c: PipelineCard) => sel.some((x) => x.pipeline_id === c.pipeline_id);
  const toggleSel = (c: PipelineCard) => {
    if (isSel(c)) { setSel((s) => s.filter((x) => x.pipeline_id !== c.pipeline_id)); return; }
    if (sel.length && sel[0]!.job_id !== c.job_id) { toast.error("Pick candidates from the same job to compare them."); return; }
    if (sel.some((x) => x.candidate_id === c.candidate_id)) return;
    if (sel.length >= SELECT_MAX) { toast.error(`You can compare up to ${SELECT_MAX} candidates.`); return; }
    setSel((s) => [...s, c]);
  };
  const selJob = sel[0]?.job_id ?? null;
  async function compareSel() {
    setBusy("compare");
    try {
      const current = await listComparedCandidates(uid);
      const ids = sel.map((c) => c.candidate_id);
      for (const id of current) if (!ids.includes(id)) await setComparedCandidate(uid, id, false);
      for (const id of ids) if (!current.includes(id)) await setComparedCandidate(uid, id, true);
      await qc.invalidateQueries({ queryKey: ["cmp-cands", uid] });
      navigate({ to: "/recruiter/candidates/compare", search: selJob ? { job: selJob } : {} });
    } catch (e) { toast.error(friendlyError(e, "Could not open the comparison.")); }
    finally { setBusy(""); }
  }
  async function shareSel() {
    if (!selJob) return;
    setBusy("share");
    try {
      const r = await share({ data: { jobId: selJob, candidateIds: sel.map((c) => c.candidate_id) } });
      if (!r.team) toast.info("This job has no hiring team yet. Add them on the job page.");
      else { toast.success(`Comparison sent to ${r.sent} of ${r.team} hiring team member${r.team === 1 ? "" : "s"}.`); setSel([]); }
    } catch (e) { toast.error(friendlyError(e, "Could not share the comparison.")); }
    finally { setBusy(""); }
  }

  const [closing, setClosing] = useState<PipelineCard | null>(null);
  const [offerFor, setOfferFor] = useState<{ c: PipelineCard; existing: Offer | null; advance: boolean } | null>(null);
  const [hired, setHired] = useState<PipelineCard | null>(null);
  const [renege, setRenege] = useState<PipelineCard | null>(null);
  const [fastTrack, setFastTrack] = useState<PipelineCard | null>(null);
  const refQ = useQuery({ queryKey: ["reference-badges", uid], queryFn: listReferenceBadges });
  const refOf = (c: { job_id: string | null; candidate_id: string }) => refQ.data?.find((r) => r.job_id === c.job_id && r.candidate_id === c.candidate_id);
  const savedQ = useQuery({ queryKey: ["saved-entries", uid], queryFn: () => listSavedEntries(uid) });
  async function openOffer(c: PipelineCard, advance: boolean) {
    if (!c.job_id) return false;
    let existing: Offer | null = null;
    try { existing = await latestOffer(c.job_id, c.candidate_id); } catch { /* show empty form */ }
    setOfferFor({ c, existing, advance }); return true;
  }
  const [offerGuard, setOfferGuard] = useState<{ c: PipelineCard; stage: Stage; offer: Offer } | null>(null);
  const [guard, setGuard] = useState<{ c: PipelineCard; stage: Stage; kind: "pending_offer" | "no_offer" | "skip"; skipped: string[] } | null>(null);
  const [outside, setOutside] = useState(false);
  async function move(c: PipelineCard, stage: Stage, confirmed = false, offerChecked = false, guarded = false) {
    const from = c.current_stage as Stage;
    if (from === stage) return;
    if (!canMoveCard(from, c.jobs?.job_status)) { toast.info("Hired candidates are locked — the job is closed. Reopen the job to make changes."); return; }
    if (!guarded && stage === "hired" && c.job_id) {
      let o: Offer | null = null;
      try { o = await latestOffer(c.job_id, c.candidate_id); } catch { /* treat as no offer */ }
      const k = hireCheck(o?.status);
      if (k !== "ok") { setOutside(false); setGuard({ c, stage, kind: k, skipped: [] }); return; }
    }
    if (!guarded && !confirmed && stage !== "hired") {
      const skipped = skippedStages(from, stage);
      if (skipped.length) { setGuard({ c, stage, kind: "skip", skipped }); return; }
    }
    if (from === "offer" && !offerChecked && c.job_id) {
      let o: Offer | null = null;
      try { o = await latestOffer(c.job_id, c.candidate_id); } catch { /* ignore */ }
      if (o && needsOfferWithdrawal(from, stage, o.status)) { setOfferGuard({ c, stage, offer: o }); return; }
    }
    if (stage === "rejected" && !confirmed) { setClosing(c); return; }
    if (stage === "offer" && !confirmed && c.job_id) { await openOffer(c, true); return; }
    if (stage === "hired" && c.job_id) setHired({ ...c, current_stage: stage });
    const key = ["pipeline", uid, jobId ?? "all"];
    qc.setQueryData<PipelineCard[]>(key, (p = []) => p.map((x) => (x.pipeline_id === c.pipeline_id ? { ...x, current_stage: stage, stage_date: new Date().toISOString() } : x)));
    try {
      await moveStage(c, stage);
      if (canUndoMove(from, stage)) toast.success(moveToast(from, stage), { duration: 6000, action: { label: "Undo", onClick: () => { void moveStage(c, from).then(() => { toast.success(`Moved back to ${from[0]!.toUpperCase()}${from.slice(1)}`); qc.invalidateQueries({ queryKey: ["pipeline"] }); qc.invalidateQueries({ queryKey: ["job-applications"] }); }).catch((e) => toast.error(friendlyError(e, "Couldn't undo"))); } } });
      else toast.success(moveToast(from, stage));
      if (shouldAutoSchedule(from, stage, !!ivOf(c))) setSched({ ...c, current_stage: stage }); } catch (e) { toast.error(friendlyError(e, "Unable To Update Pipeline")); }
    qc.invalidateQueries({ queryKey: ["pipeline"] }); qc.invalidateQueries({ queryKey: ["job-applications"] });
  }
  async function withdrawAndMove() {
    if (!offerGuard) return;
    const { c, stage, offer } = offerGuard;
    setOfferGuard(null);
    try { await withdrawOffer(offer.offer_id); toast.success("Offer withdrawn"); qc.invalidateQueries({ queryKey: ["offer-pill"] }); }
    catch (e) { toast.error(friendlyError(e, "Could not withdraw the offer.")); return; }
    await move(c, stage, false, true);
  }
  const NEXT: Partial<Record<Stage, [Stage, string]>> = { contacted: ["interviewing", "Move To Interviewing"], interviewing: ["shortlisted", "Shortlist"], offer: ["hired", "Mark Hired"] };


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
          <div className="min-w-0">{jobId && <Link to="/recruiter/pipeline" className="mb-2 block text-sm font-semibold text-muted-foreground hover:text-primary">← All Requisitions</Link>}
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/80 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>AI pipeline active</span>
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{j ? `${j.job_title} Pipeline` : "Hiring Pipeline"}</h1>
            <p className="text-sm text-muted-foreground">{j ? `${j.location} · ${lbl(ARRANGEMENT, j.work_arrangement)}` : "Drag candidates between stages. Moving someone to Interviewing lets you book the interview."}</p></div>
          <div className="flex flex-wrap gap-2"><Link to="/recruiter/applications" className={btn}>Applications</Link>
            <SearchSelect ariaLabel="Filter by company" className="w-52" value={coSel} onChange={(v) => { setCo(v); if (jobId) navigate({ to: "/recruiter/pipeline", search: v ? { co: v } : {} }); }}
              allLabel="All companies" placeholder="Search companies..." options={companies.map(([id, name]) => ({ value: id, label: name }))} />
            <SearchSelect ariaLabel="Switch job" className="w-64" value={jobId ?? ""} onChange={(v) => { if (v) navigate({ to: "/recruiter/pipeline/$jobId", params: { jobId: v } }); else navigate({ to: "/recruiter/pipeline" }); }}
              allLabel="All jobs" placeholder="Search job titles..." options={myJobs.filter((j) => !coSel || j.companyId === coSel).map((j) => ({ value: j.id, label: coSel ? j.title : `${j.company} — ${j.title}` }))} /></div>
        </div>
        <div className="relative mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
          <ul className="space-y-1.5 text-sm">{brief.map((b) => <li key={b} className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{b}</li>)}</ul>
          <div className="flex flex-wrap items-center gap-1.5">{metrics.map(([l, v], i) => <div key={l} className="flex items-center gap-1.5"><div className="rounded-xl border border-border bg-card/90 px-3 py-2 text-center"><p className="font-display text-xl font-extrabold">{v}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{l}</p></div>{i < metrics.length - 1 && <ChevronRight className="h-4 w-4 text-primary/50" />}</div>)}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Match</span><MatchFilter value={mm} onChange={setMm} />
        <label className="ml-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sort
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value as typeof sortMode)} aria-label="Sort pipeline cards" className="h-9 rounded-xl border border-input bg-card px-2 text-sm font-medium normal-case tracking-normal text-foreground">
            <option value="auto">Smart (rank Shortlisted by interviews)</option>
            <option value="interview">Highest interview rating</option>
            <option value="match">Highest match score</option>
            <option value="workflow">Workflow order</option>
          </select></label>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => scrollBy(-1)} aria-label="Scroll pipeline left" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card hover:border-primary hover:text-primary"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => scrollBy(1)} aria-label="Scroll pipeline right" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card hover:border-primary hover:text-primary"><ChevronRight className="h-4 w-4" /></button>
        </div></div>
      {tax.error ? <ErrorBox msg="Unable To Load Pipeline" retry={() => tax.refetch()} /> : q.isLoading || !tax.data ? <div className={`${card} h-72 animate-pulse`} /> : (
        <div ref={boardRef} onDragOver={edgeScroll} className="pipeline-scroll -mx-4 overflow-x-scroll px-4 pb-3"><div className="flex gap-4" style={{ minWidth: STAGES.length * 276 }}>
          {BOARD_STAGES.map(([key, title], si) => {
            const filtered = cards.filter((c) => c.current_stage === key && meetsMinMatch(scoreOf(c), mm));
            const byIv = sortMode === "interview" || (sortMode === "auto" && key === "shortlisted");
            const col = byIv ? [...filtered].sort((a, b) => compareByInterview(perfOf(a), perfOf(b)) || (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1))
              : sortMode === "match" ? [...filtered].sort((a, b) => (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1)) : filtered;
            const ranked = byIv && ["interviewing", "shortlisted"].includes(key);
            const tone = key === "hired" ? "bg-success" : key === "rejected" ? "bg-muted-foreground/40" : "bg-gradient-primary";
            return (
              <section key={key} onDragOver={(e) => e.preventDefault()} onDrop={() => { const c = cards.find((x) => x.pipeline_id === drag); if (c) move(c, key as Stage); setDrag(null); }}
                className={`w-[16.5rem] shrink-0 rounded-2xl border bg-card/60 p-3 backdrop-blur-sm transition-all ${drag ? "border-primary/40 ring-2 ring-primary/15" : "border-border"}`} aria-label={`${title} column`}>
                <div className={`mb-3 h-1 rounded-full ${tone} ${key === "rejected" ? "opacity-60" : ""}`} style={key === "rejected" || key === "hired" ? undefined : { opacity: 0.35 + si * 0.12 }} />
                <div className="mb-3 flex items-center justify-between px-1"><h2 className="text-sm font-bold">{title}</h2><span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">{col.length}</span></div>
                {ranked && col.length > 1 && <p className="-mt-2 mb-2 px-1 text-[10px] font-semibold text-muted-foreground">Ranked by interview results</p>}
                <div className="min-h-24 space-y-3">{col.map((c, idx) => {
                  const next = NEXT[c.current_stage as Stage];
                  const perf = perfOf(c);
                  return (
                  <article key={c.pipeline_id} data-candidate={c.candidate_id} draggable={canMoveCard(c.current_stage as Stage, c.jobs?.job_status)} title={canMoveCard(c.current_stage as Stage, c.jobs?.job_status) ? undefined : "Hired — locked"} onDragStart={() => setDrag(c.pipeline_id)} onDragEnd={() => setDrag(null)} className={`${card} group/card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 ${canMoveCard(c.current_stage as Stage, c.jobs?.job_status) ? "cursor-grab active:cursor-grabbing" : "cursor-default"} ${drag === c.pipeline_id ? "opacity-50" : ""} ${isSel(c) ? "border-primary ring-2 ring-primary/30" : ""} ${flash === c.candidate_id ? "scroll-m-24 border-primary ring-4 ring-primary/40 shadow-elevated animate-pulse" : ""}`}>
                    <div className="flex items-start gap-2">{c.job_id && <button type="button" role="checkbox" aria-checked={isSel(c)} aria-label={`Select ${c.name} to compare`} onClick={() => toggleSel(c)} className={`mt-2 grid h-4 w-4 shrink-0 place-items-center rounded border transition-opacity ${isSel(c) ? "border-primary bg-primary text-primary-foreground opacity-100" : `border-input bg-card hover:border-primary ${sel.length ? "opacity-100" : "opacity-0 group-hover/card:opacity-100 focus:opacity-100"}`}`}>{isSel(c) && <Check className="h-3 w-3" />}</button>}{(() => { const inner = <><Avatar name={c.name} size="h-9 w-9 text-xs ring-2 ring-primary/30 ring-offset-1 ring-offset-card" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold group-hover:text-primary group-hover:underline">{c.name}</p><p className="truncate text-xs text-muted-foreground">{c.candTitle} · {c.years}y</p>{c.withdrawnAt && <span title={`Withdrew ${fmt(c.withdrawnAt)}`} className="mt-1 inline-block rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">Withdrawn by candidate · {withdrawReasonLabel(c.withdrawReason)}</span>}{c.current_stage === "rejected" && isRejectionPending(c.rejectionDeliverAt, c.rejectionNotifiedAt) && <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Update sends {fmt(c.rejectionDeliverAt!)}</span>}{c.renegedAt && <span title={`Backed out ${fmt(c.renegedAt)}`} className="mt-1 inline-block rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">Backed out after hire · {renegeReasonLabel(c.renegeReason)}</span>}</div></>; const cls = "group flex min-w-0 flex-1 items-start gap-2 rounded-lg"; return c.applicationId ? <Link to="/recruiter/applications/$id" params={{ id: c.applicationId }} className={cls} aria-label={`View ${c.name}`}>{inner}</Link> : <Link to="/recruiter/candidates/$id" params={{ id: c.candidate_id }} className={cls} aria-label={`View ${c.name}`}>{inner}</Link>; })()}
                      </div>
                    <div className="mt-2 flex items-center justify-between gap-2"><MatchBadge score={scoreOf(c)} /><span className="text-[11px] text-muted-foreground">{c.appDate ? `Applied ${fmt(c.appDate)}` : "Sourced"}</span></div>
                    {perf.scored > 0 && <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {ranked && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${idx === 0 && !perf.concerns ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>#{idx + 1}</span>}
                      <span title={`${perf.passed} of ${perf.scored} scored rounds passed`} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${perf.concerns ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}><Star className="h-3 w-3 fill-current" />{perf.avg ?? "–"} · {perf.scored} round{perf.scored === 1 ? "" : "s"}{perf.concerns ? ` · ${perf.concerns} concern${perf.concerns === 1 ? "" : "s"}` : ""}</span>
                    </div>}
                    {!["hired", "rejected"].includes(c.current_stage) && (() => { const a = stageAge(c.stage_date); return <p className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.stale ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>{a.days === 0 ? "Updated today" : `${a.days}d in ${title}`}</p>; })()}
                    {!jobId && c.jobs?.job_title && <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{c.jobs.job_title}</p>}
                    {(() => { const r = picksOf(c); if (!r.length) return null; const tip = r.map((x) => `${x.job_stakeholders?.name ?? "Team member"}${x.job_stakeholders?.hiring_role ? ` (${x.job_stakeholders.hiring_role})` : ""}${x.note ? `: "${x.note}"` : ""}`).join("\n");
                      return <><p title={tip} className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning"><Star className="h-3 w-3 shrink-0 fill-current" />Team Pick · {r.length === 1 ? (r[0]!.job_stakeholders?.name ?? "1 recommendation") : `${r.length} recommendations`}</p>
                        {r.filter((x) => x.note).map((x, i) => <blockquote key={i} className="mt-1.5 rounded-lg border-l-2 border-warning bg-warning/10 px-2 py-1 text-[11px] leading-snug text-foreground"><span className="italic">“{x.note}”</span><span className="mt-0.5 block text-[10px] font-semibold text-muted-foreground">— {x.job_stakeholders?.name ?? "Team member"}{x.job_stakeholders?.hiring_role ? `, ${x.job_stakeholders.hiring_role}` : ""}</span></blockquote>)}</>; })()}
                    {c.current_stage === "shortlisted" && <ShortlistSummary steps={stepsOf(c)} planned={planOf(c).length} onOffer={c.job_id ? () => openOffer(c, true) : undefined} onFollowUp={() => { setEditIv(undefined); setFollowUp(true); setSched(c); }} onEdit={(i) => { setEditIv(i); setSched(c); }} onScorecard={(i) => setScoreFor({ c, i })} />}
                    {c.current_stage === "interviewing" && <RoundStepper steps={stepsOf(c)} planned={planOf(c).length} canSchedule onSchedule={() => { setEditIv(undefined); setFollowUp(false); setSched(c); }} onEdit={(i) => { setEditIv(i); setSched(c); }} onScorecard={(i) => setScoreFor({ c, i })} />}
                    {(() => { const r = refOf(c); if (!r) return null; const pr = referenceProgress(r.target, r.done, r.status); return <p className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${pr.done ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}><ClipboardCheck className="h-3 w-3" />{pr.label}</p>; })()}
                    {c.current_stage === "offer" && c.job_id && <OfferPill jobId={c.job_id} candidateId={c.candidate_id} onOpen={() => openOffer(c, false)} />}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2.5">
                      <MessageButton role="recruiter" candidateId={c.candidate_id} jobId={c.job_id} label="Message" className={`${miniBtn} shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5`} />
                      {next ? <button type="button" onClick={() => move(c, next[0])} className={`${miniBtn} min-w-0 flex-1 justify-center`}>{next[1]}<ArrowRight className="h-3 w-3" /></button> : <span className="flex-1" />}
                      {c.current_stage !== "rejected" && canMoveCard(c.current_stage as Stage, c.jobs?.job_status) && <button type="button" onClick={() => move(c, "rejected")} aria-label={`Mark ${c.name} as not moving forward`} className="w-full pt-1 text-center text-[11px] font-medium text-muted-foreground transition-colors hover:text-destructive">Not moving forward</button>}
                      {c.current_stage === "rejected" && c.applicationId && isRejectionPending(c.rejectionDeliverAt, c.rejectionNotifiedAt) && <div className="flex justify-center gap-3 pt-1 text-[11px] font-medium"><button type="button" onClick={() => void move(c, (c.rejectionPrevStage as Stage | null) ?? "contacted", true, false, true)} className="text-primary hover:underline">Undo — keep {c.name.split(" ")[0]}</button><button type="button" onClick={() => void sendRejectionNow(c.applicationId!).then(() => { toast.success("Update will go out within the hour"); qc.invalidateQueries({ queryKey: ["pipeline"] }); }).catch((e) => toast.error(friendlyError(e, "Could not send now")))} className="text-muted-foreground hover:text-foreground">Send now</button></div>}{c.job_id && canReportRenege(c.current_stage, c.renegedAt) && <button type="button" onClick={() => setRenege(c)} aria-label={`Report ${c.name} backed out`} className="w-full pt-1 text-center text-[11px] font-medium text-muted-foreground transition-colors hover:text-warning">Backed out?</button>}
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

      {sel.length > 0 && <div role="region" aria-label="Selected candidates" className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/90 p-3 shadow-elevated backdrop-blur-md">
        <div className="min-w-0 flex-1"><p className="text-sm font-bold">{sel.length} of {SELECT_MAX} selected</p><p className="truncate text-xs text-muted-foreground">{sel.length < 2 ? "Select at least 2 candidates from the same job" : sel.map((c) => c.name).join(", ")}</p></div>
        <button type="button" onClick={compareSel} disabled={sel.length < 2 || !!busy} className={`${btn} disabled:opacity-50`}><GitCompare className="h-4 w-4" />{busy === "compare" ? "Opening…" : "Compare"}</button>
        <button type="button" onClick={shareSel} disabled={sel.length < 2 || !!busy} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"><Send className="h-4 w-4" />{busy === "share" ? "Sending…" : "Share with Hiring Team"}</button>
        <button type="button" onClick={() => setSel([])} aria-label="Clear selection" className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>}
      <AlertDialog open={!!guard} onOpenChange={(o) => { if (!o) setGuard(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{guard?.kind === "pending_offer" ? "Offer not accepted yet" : guard?.kind === "no_offer" ? "No accepted offer on record" : `Skip ${guard?.skipped.join(" and ")}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {guard?.kind === "pending_offer" ? `${guard.c.name} hasn't accepted the offer yet. They'll move to Hired automatically the moment they accept it. Marking them hired now could close the job and notify other candidates too early.`
                : guard?.kind === "no_offer" ? `${guard.c.name} has no accepted offer in the platform. Only continue if they accepted outside the platform (for example, a signed paper offer).`
                : guard ? `You're moving ${guard.c.name} straight to ${guard.stage === "offer" ? "Offer" : guard.stage[0]!.toUpperCase() + guard.stage.slice(1)}, skipping ${guard.skipped.join(" and ")}. Was that intended?` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {guard?.kind === "no_offer" && <label className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={outside} onChange={(e) => setOutside(e.target.checked)} className="mt-0.5" /><span>I confirm {guard.c.name} accepted an offer outside the platform.</span></label>}
          <AlertDialogFooter>
            <AlertDialogCancel>{guard?.kind === "skip" ? "Cancel" : "Keep Current Stage"}</AlertDialogCancel>
            {guard?.kind === "pending_offer" && <AlertDialogAction onClick={() => { const g = guard; setGuard(null); void openOffer(g.c, false); }}>Review Offer</AlertDialogAction>}
            {guard?.kind === "no_offer" && <AlertDialogAction disabled={!outside} onClick={() => { const g = guard; setGuard(null); void move(g.c, g.stage, false, false, true); }}>Mark Hired</AlertDialogAction>}
            {guard?.kind === "skip" && <AlertDialogAction onClick={() => { const g = guard; setGuard(null); void move(g.c, g.stage, false, false, true); }}>Yes, Move</AlertDialogAction>}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!offerGuard} onOpenChange={(o) => { if (!o) setOfferGuard(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw the pending offer?</AlertDialogTitle>
            <AlertDialogDescription>
              {offerGuard ? `${offerGuard.c.name} has a pending offer (${formatSalaryAmount(offerGuard.offer.salary_amount, offerGuard.offer.salary_currency)}${offerGuard.offer.start_date ? `, start ${fmt(offerGuard.offer.start_date)}` : ""}). Moving them out of Offer withdraws it so they can no longer accept it.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep in Offer</AlertDialogCancel>
            <AlertDialogAction onClick={withdrawAndMove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Withdraw Offer &amp; Move</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {closing && <NotMovingForwardDialog name={closing.name} jobTitle={closing.jobs?.job_title ?? j?.job_title} upcomingInterview={(() => { const iv = ivOf(closing); return iv ? fmtInterview(iv.scheduled_at) : null; })()} silverEligible={isSilverEligible(closing.current_stage) && !!closing.job_id} onCancel={() => setClosing(null)} onConfirm={(silver, reason, timing) => { const c = closing; setClosing(null); const iv = ivOf(c); void (c.applicationId ? scheduleRejection(c.applicationId, timing, c.current_stage) : Promise.resolve()).then(() => move(c, "rejected", true)).then(() => { if (timing !== "now") toast.info(`${c.name} will be notified ${timing === "24h" ? "in 24 hours" : "tomorrow at 9:00 AM"}. You can undo until then.`); }).then(async () => { await supabase.from("recruiting_pipeline").update({ disposition_reason: reason }).eq("pipeline_id", c.pipeline_id); if (iv) { await cancelInterview(iv.interview_id); toast.info("Upcoming interview cancelled"); void qc.invalidateQueries({ queryKey: ["interviews", uid] }); } }).catch((e) => toast.error(friendlyError(e, "Could not finish closing out"))); if (silver && c.job_id) void markSilverMedalists(uid, [c.candidate_id], c.job_id).then(() => { toast.success(`${c.name} saved as a Silver Medalist`); void qc.invalidateQueries({ queryKey: ["saved-entries", uid] }); }).catch((e) => toast.error(friendlyError(e, "Could not save Silver Medalist"))); }} />}
      {offerFor && offerFor.c.job_id && <OfferDialog ctx={{ uid, jobId: offerFor.c.job_id, candidateId: offerFor.c.candidate_id, applicationId: offerFor.c.applicationId ?? null }}
        candidateName={offerFor.c.name} jobTitle={offerFor.c.jobs?.job_title ?? j?.job_title ?? "this role"} existing={offerFor.existing}
        defaultSalary={j?.maximum_salary ?? null} defaultCurrency={j?.salary_currency}
        onClose={() => setOfferFor(null)}
        onSkip={offerFor.advance ? () => { const c = offerFor.c; setOfferFor(null); move(c, "offer", true); } : undefined}
        onDone={() => { const o = offerFor; setOfferFor(null); qc.invalidateQueries({ queryKey: ["offer-pill"] }); if (o.advance) move(o.c, "offer", true); }} />}
      {renege && renege.job_id && <RenegeDialog name={renege.name} jobId={renege.job_id} candidateId={renege.candidate_id} jobClosed={renege.jobs?.job_status === "closed"} onClose={() => setRenege(null)}
        onDone={async () => { const c = renege; setRenege(null); await qc.invalidateQueries({ queryKey: ["pipeline"] }); qc.invalidateQueries({ queryKey: ["job-applications"] }); qc.invalidateQueries({ queryKey: ["offer-pill"] }); setFastTrack(c); }} />}
      {fastTrack && (() => { const silver = new Set((savedQ.data ?? []).filter((e) => e.silver_medalist_job_id === fastTrack.job_id).map((e) => e.candidate_id)); const runners = fastTrackCandidates(cards.filter((x) => x.job_id === fastTrack.job_id), fastTrack.candidate_id, silver);
        return <FastTrackDialog runners={runners} silverIds={silver} onClose={() => setFastTrack(null)} onRevive={(r, stage) => { const card = cards.find((x) => x.pipeline_id === r.pipeline_id); setFastTrack(null); if (card) void move({ ...card, jobs: card.jobs ? { ...card.jobs, job_status: "active" } : card.jobs }, stage, false, false, true); }} />; })()}
      {hired && hired.job_id && <HireDialog uid={uid} name={hired.name} jobId={hired.job_id} jobTitle={hired.jobs?.job_title ?? j?.job_title ?? "this role"} candidateId={hired.candidate_id} onClose={() => setHired(null)} />}
      {sched && <ScheduleInterviewDialog key={sched.pipeline_id} open onOpenChange={(o) => { if (!o) { setSched(null); setFollowUp(false); } }} candidateName={sched.name} existing={editIv ?? ivOf(sched)} priorRounds={roundsOf(sched)} plan={followUp ? FOLLOW_UP_PLAN : planOf(sched)}
        ctx={{ uid, candidateId: sched.candidate_id, jobId: sched.job_id, pipelineId: sched.pipeline_id, applicationId: sched.applicationId }}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["interviews"] }); qc.invalidateQueries({ queryKey: ["my-interviews"] }); }} />}
      {scoreFor && <ScorecardDialog key={scoreFor.i.interview_id} open onOpenChange={(o) => !o && setScoreFor(null)} uid={uid} interview={scoreFor.i} candidateName={scoreFor.c.name} existing={(scQ.data ?? []).find((x) => x.interview_id === scoreFor.i.interview_id)} onSaved={() => qc.invalidateQueries({ queryKey: ["scorecards"] })} />}
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Bell, Building2, CalendarClock, CalendarDays, CalendarPlus, Check, ClipboardCheck, Clock, Copy, Globe, KanbanSquare, MapPin, Pencil, Search, Sparkles, Star, Video } from "lucide-react";
import { toast } from "sonner";
import { SearchSelect } from "@/components/ui/search-select";
import { AddToCalendar, CandidateInterviewActions, RescheduleBadge, ScheduleInterviewDialog, ScorecardDialog, recommendationLabel } from "@/components/applications/Interviews";
import { MessageButton } from "@/components/messages/Messages";
import { PLATFORMS, countdown, fmtInterview, groupByDay, needsScorecard, otherZoneTime, roundLabel, splitInterviews } from "@/lib/interview-rules";
import { listMyInterviews, listMyScorecards, type InterviewRow, type Scorecard } from "@/lib/interviews-data";

type Role = "candidate" | "recruiter";
const lbl = (list: [string, string][], k: string) => list.find(([v]) => v === k)?.[1] ?? k;
const calTitle = (i: InterviewRow, role: Role) => role === "candidate"
  ? `${roundLabel(i)} · ${i.job_title}${i.company_name ? ` at ${i.company_name}` : ""}`
  : `${roundLabel(i)} with ${i.candidate_name} — ${i.job_title}`;
/** Interviews belonging to the same hiring process (same application, or same candidate + job). */
const processKey = (i: InterviewRow) => i.application_id ?? i.pipeline_id ?? `${i.candidate_id}:${i.job_id}`;

/** Round-by-round progress for one hiring process. */
function Journey({ rounds, current }: { rounds: InterviewRow[]; current: string }) {
  if (rounds.length < 2) return null;
  const now = Date.now();
  return (
    <ol className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Interview rounds">
      {rounds.map((r, k) => {
        const done = new Date(r.scheduled_at).getTime() + r.duration_minutes * 60000 <= now;
        const here = r.interview_id === current;
        return (
          <li key={r.interview_id} className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${here ? "border-primary bg-primary text-primary-foreground" : done ? "border-success/40 bg-success/10 text-success" : "border-border bg-card text-muted-foreground"}`}>
              {done && !here ? <Check className="h-3 w-3" /> : null}{roundLabel(r)}
            </span>
            {k < rounds.length - 1 && <span className="h-px w-3 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

export function useUpcomingInterviewCount(uid: string, role: Role) {
  const q = useQuery({ queryKey: ["my-interviews", uid, role], queryFn: () => listMyInterviews(uid, role), staleTime: 60000 });
  return splitInterviews(q.data ?? []).upcoming.length;
}

function JoinButton({ i }: { i: InterviewRow }) {
  const online = i.format === "online";
  return online
    ? <a href={i.meeting_url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-primary px-3 text-sm font-bold text-primary-foreground shadow-soft"><Video className="h-4 w-4" />Join call</a>
    : <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.location_address)}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-primary px-3 text-sm font-bold text-primary-foreground shadow-soft"><MapPin className="h-4 w-4" />Directions</a>;
}

function EditButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:border-primary hover:text-primary"><Pencil className="h-4 w-4" />Edit / Reschedule</button>;
}

function Who({ i, role }: { i: InterviewRow; role: Role }) {
  if (role === "recruiter") return <Link to="/recruiter/candidates/$id" params={{ id: i.candidate_id }} className="font-semibold text-primary hover:underline">{i.candidate_name}</Link>;
  if (!i.company_name) return <span className="font-semibold">Recruiter</span>;
  return <Link to="/candidate/jobs" search={{ q: i.company_name }} className="font-semibold hover:text-primary hover:underline underline-offset-2">{i.company_name}</Link>;
}

function JobTitle({ i, role }: { i: InterviewRow; role: Role }) {
  const cls = "hover:text-primary hover:underline underline-offset-2 transition-colors";
  if (!i.job_id) return <>{i.job_title}</>;
  return role === "recruiter"
    ? <Link to="/recruiter/jobs/$id" params={{ id: i.job_id }} className={cls}>{i.job_title}</Link>
    : <Link to="/candidate/jobs/$id" params={{ id: i.job_id }} className={cls}>{i.job_title}</Link>;
}

function Spotlight({ i, role, onEdit, rounds, onChanged }: { i: InterviewRow; role: Role; onEdit?: (() => void) | undefined; rounds: InterviewRow[]; onChanged?: () => void }) {
  const online = i.format === "online";
  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary-soft via-card to-card p-6 shadow-soft">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative flex flex-wrap items-start gap-5">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-center text-primary-foreground shadow-soft">
          <div><p className="text-[11px] font-bold uppercase">{new Date(i.scheduled_at).toLocaleDateString(undefined, { month: "short" })}</p><p className="font-display text-3xl font-extrabold leading-none">{new Date(i.scheduled_at).getDate()}</p></div>
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary"><Sparkles className="h-3 w-3" />Next interview · {countdown(i.scheduled_at, i.duration_minutes)}</span>
          <h2 className="mt-1 font-display text-2xl font-extrabold"><JobTitle i={i} role={role} /></h2>
          <p className="text-sm text-muted-foreground"><Who i={i} role={role} /> · {roundLabel(i)}</p>
          <Journey rounds={rounds} current={i.interview_id} />
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4 text-primary" />{fmtInterview(i.scheduled_at)} · {i.duration_minutes} min</span>
            <span className="inline-flex items-center gap-1">{online ? <Video className="h-4 w-4 text-primary" /> : <MapPin className="h-4 w-4 text-primary" />}{online ? lbl(PLATFORMS, i.platform) : i.location_address}</span>
            <ZoneHint i={i} />
          </p>
          {i.location_instructions && <p className="mt-1 text-xs text-muted-foreground">{i.location_instructions}</p>}
          {i.notes && <p className="mt-3 whitespace-pre-line rounded-xl bg-muted/60 p-3 text-sm">{i.notes}</p>}
          <RescheduleBadge i={i} candidate={role === "candidate"} />
          <div className="mt-4 flex flex-wrap gap-2">
            <JoinButton i={i} />
            {online && <button type="button" onClick={() => { navigator.clipboard.writeText(i.meeting_url); toast.success("Link copied"); }} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:border-primary hover:text-primary"><Copy className="h-4 w-4" />Copy link</button>}
            <AddToCalendar i={i} title={calTitle(i, role)} />
            {onEdit && <EditButton onClick={onEdit} />}
            {role === "candidate" && <CandidateInterviewActions i={i} onChanged={onChanged} />}
            {role === "recruiter" && <QuickLinks i={i} />}
          </div>
        </div>
      </div>
    </section>
  );
}

const iconBtn = "grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary";

function QuickLinks({ i }: { i: InterviewRow }) {
  return (
    <span className="flex items-center gap-1.5">
      {i.job_id && <Link to="/recruiter/pipeline/$jobId" params={{ jobId: i.job_id }} search={{ candidate: i.candidate_id }} aria-label="Open in Pipeline" title="Open in Pipeline" className={iconBtn}><KanbanSquare className="h-4 w-4" /></Link>}
      <MessageButton role="recruiter" candidateId={i.candidate_id} jobId={i.job_id} iconOnly label="Open chat" className={iconBtn} />
    </span>
  );
}

function ZoneHint({ i }: { i: InterviewRow }) {
  const t = otherZoneTime(i.scheduled_at, i.timezone);
  if (!t) return null;
  return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={`Scheduled in ${i.timezone}`}><Globe className="h-3.5 w-3.5" />{t}</span>;
}

function Row({ i, role, past, onEdit, card, onScore, onNext, onChanged }: { i: InterviewRow; role: Role; past?: boolean; onChanged?: () => void; onEdit?: (() => void) | undefined; card?: Scorecard | undefined; onScore?: (() => void) | undefined; onNext?: (() => void) | undefined }) {
  const online = i.format === "online";
  return (
    <li className={`flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-soft ${past && card ? "opacity-75" : ""}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">{online ? <Video className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold"><JobTitle i={i} role={role} /> <span className="font-normal text-muted-foreground">· {roundLabel(i)}</span></p>
        <p className="truncate text-sm text-muted-foreground"><Who i={i} role={role} /> · {fmtInterview(i.scheduled_at)} · {i.duration_minutes} min · {online ? lbl(PLATFORMS, i.platform) : "In person"}</p>
        <ZoneHint i={i} />
        {!past && i.reschedule_requested_at && <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning" title={i.reschedule_note || undefined}><CalendarClock className="h-3 w-3" />{role === "candidate" ? "New time requested" : "Reschedule requested"}</span>}
      </div>
      {role === "recruiter" && <QuickLinks i={i} />}
      {past ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Completed</span>
          {onScore && (card
            ? <button type="button" onClick={onScore} title="Private scorecard — edit" className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-bold ${card.recommendation.endsWith("hire") ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive"}`}><Star className="h-4 w-4 fill-current" />{card.rating}/5 · {recommendationLabel(card.recommendation)}</button>
            : <button type="button" onClick={onScore} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-primary px-3 text-sm font-bold text-primary-foreground shadow-soft"><ClipboardCheck className="h-4 w-4" />Submit scorecard</button>)}
          {onNext && <button type="button" onClick={onNext} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary-soft px-3 text-sm font-semibold text-primary hover:border-primary"><CalendarPlus className="h-4 w-4" />Schedule Round {(i.round_number ?? 1) + 1}</button>}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">{countdown(i.scheduled_at, i.duration_minutes)}</span>
          <JoinButton i={i} />
          <AddToCalendar i={i} title={calTitle(i, role)} />
          {onEdit && <EditButton onClick={onEdit} />}
          {role === "candidate" && <CandidateInterviewActions i={i} onChanged={onChanged} />}
        </div>
      )}
    </li>
  );
}

export function InterviewsHub({ uid, role }: { uid: string; role: Role }) {
  const q = useQuery({ queryKey: ["my-interviews", uid, role], queryFn: () => listMyInterviews(uid, role) });
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [co, setCo] = useState(""); const [job, setJob] = useState("");
  const all = q.data ?? [];
  const companies = useMemo(() => [...new Set(all.map((i) => i.company_name).filter(Boolean))].sort().map((c) => ({ value: c, label: c })), [all]);
  const jobs = useMemo(() => [...new Map(all.filter((i) => !co || i.company_name === co).filter((i) => i.job_id).map((i) => [i.job_id!, i.job_title])).entries()].map(([value, label]) => ({ value, label })), [all, co]);
  const [term, setTerm] = useState(""); const [onlyPending, setOnlyPending] = useState(false);
  const t = term.trim().toLowerCase();
  const filtered = all.filter((i) => (!co || i.company_name === co) && (!job || i.job_id === job)
    && (!t || [i.candidate_name, i.job_title, i.company_name].some((s) => s?.toLowerCase().includes(t))));
  const { upcoming, past } = splitInterviews(filtered);
  const next = upcoming[0];
  const qc = useQueryClient();
  const [editing, setEditing] = useState<InterviewRow | null>(null);
  const editFor = (i: InterviewRow) => (role === "recruiter" ? () => setEditing(i) : undefined);
  const sc = useQuery({ queryKey: ["scorecards", uid], queryFn: () => listMyScorecards(uid), enabled: role === "recruiter" });
  const cardOf = (i: InterviewRow) => (sc.data ?? []).find((c) => c.interview_id === i.interview_id);
  const pending = role === "recruiter" && sc.data ? needsScorecard(past, new Set(sc.data.map((c) => c.interview_id))) : [];
  const list = tab === "upcoming" ? upcoming : onlyPending ? pending : past;
  const roundsOf = (i: InterviewRow) => all.filter((x) => processKey(x) === processKey(i)).sort((a, b) => (a.round_number ?? 1) - (b.round_number ?? 1) || a.scheduled_at.localeCompare(b.scheduled_at));
  const isLatest = (i: InterviewRow) => { const r = roundsOf(i); return r[r.length - 1]?.interview_id === i.interview_id; };
  const [scoring, setScoring] = useState<InterviewRow | null>(null);
  const [nextFor, setNextFor] = useState<InterviewRow | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["my-interviews"] }); qc.invalidateQueries({ queryKey: ["interviews"] }); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold"><CalendarDays className="h-7 w-7 text-primary" />Interviews</h1>
          <p className="text-sm text-muted-foreground">{role === "candidate" ? "Every interview recruiters have scheduled with you, in one place." : "Your interview schedule across all jobs and candidates."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SearchSelect ariaLabel="Filter by company" className="sm:w-52" value={co} onChange={(v) => { setCo(v); setJob(""); }} allLabel="All companies" placeholder="Search companies..." options={companies} />
          <SearchSelect ariaLabel="Filter by job" className="sm:w-64" value={job} onChange={setJob} allLabel="All jobs" placeholder="Search job titles..." options={jobs} />
        </div>
      </div>

      {q.isLoading ? <div className="h-48 animate-pulse rounded-3xl bg-muted" /> : next ? <Spotlight i={next} role={role} onEdit={editFor(next)} rounds={roundsOf(next)} onChanged={refresh} /> : (
        <section className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <CalendarClock className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 font-display text-lg font-bold">No upcoming interviews</p>
          <p className="text-sm text-muted-foreground">{role === "candidate" ? "When a recruiter schedules an interview, it shows up here with the link and calendar options." : "Schedule interviews from your Pipeline board — they'll appear here."}</p>
          {role === "recruiter" && <Link to="/recruiter/pipeline" className="mt-4 inline-flex h-9 items-center rounded-xl bg-gradient-primary px-4 text-sm font-bold text-primary-foreground">Open Pipeline</Link>}
        </section>
      )}

      <p className="flex items-center gap-2 rounded-xl bg-primary-soft/60 px-3 py-2 text-xs text-muted-foreground"><Bell className="h-4 w-4 text-primary" />Tip: add interviews to your calendar — each entry reminds you 1 hour and 15 minutes before it starts.</p>

      {role === "recruiter" && pending.length > 0 && (
        <button type="button" onClick={() => { setTab("past"); setOnlyPending(true); }} className="flex w-full items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-left text-sm font-semibold text-foreground hover:border-warning">
          <AlertCircle className="h-4 w-4 text-warning" />{pending.length} interview{pending.length === 1 ? "" : "s"} awaiting your scorecard<span className="ml-auto text-xs font-bold text-primary">Review →</span>
        </button>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-fit gap-1 rounded-xl bg-muted p-1" role="tablist">
          {(["upcoming", "past"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold ${tab === t ? "bg-card text-primary shadow-soft" : "text-muted-foreground"}`}>
              {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
              {t === "past" && role === "recruiter" && pending.length > 0 && <span className="rounded-full bg-warning px-1.5 text-[10px] font-bold text-foreground">{pending.length}</span>}
            </button>
          ))}
        </div>
        {tab === "past" && role === "recruiter" && (
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} className="accent-primary" />Needs scorecard only</label>
        )}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} aria-label={role === "recruiter" ? "Search candidates" : "Search interviews"} placeholder={role === "recruiter" ? "Search candidate name…" : "Search job or company…"} className="h-9 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </div>
      </div>
      {list.length ? (
        tab === "upcoming" ? (
          <div className="space-y-5">{groupByDay(list).map((g) => (
            <section key={g.label} aria-label={g.label}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{g.label} <span className="font-semibold">· {g.items.length}</span></h3>
              <ul className="space-y-3">{g.items.map((i) => <Row key={i.interview_id} i={i} role={role} onEdit={editFor(i)} onChanged={refresh} />)}</ul>
            </section>
          ))}</div>
        ) : (
          <ul className="space-y-3">{list.map((i) => <Row key={i.interview_id} i={i} role={role} past onEdit={editFor(i)}
            card={cardOf(i)} onScore={role === "recruiter" ? () => setScoring(i) : undefined} onNext={role === "recruiter" && isLatest(i) ? () => setNextFor(i) : undefined} />)}</ul>
        )
      ) : <p className="text-sm text-muted-foreground">{term ? "No interviews match your search." : tab === "upcoming" ? "No upcoming interviews yet." : onlyPending ? "All scorecards are in — nice work." : "No past interviews yet."}</p>}
      {editing && <ScheduleInterviewDialog key={editing.interview_id} open onOpenChange={(o) => { if (!o) setEditing(null); }} existing={editing} candidateName={editing.candidate_name}
        ctx={{ uid, candidateId: editing.candidate_id, jobId: editing.job_id, pipelineId: editing.pipeline_id, applicationId: editing.application_id }}
        priorRounds={roundsOf(editing)} onSaved={refresh} />}
      {nextFor && <ScheduleInterviewDialog key={`next-${nextFor.interview_id}`} open onOpenChange={(o) => { if (!o) setNextFor(null); }} candidateName={nextFor.candidate_name} priorRounds={roundsOf(nextFor)}
        ctx={{ uid, candidateId: nextFor.candidate_id, jobId: nextFor.job_id, pipelineId: nextFor.pipeline_id, applicationId: nextFor.application_id }}
        onSaved={() => { refresh(); setTab("upcoming"); }} />}
      {scoring && <ScorecardDialog key={scoring.interview_id} open onOpenChange={(o) => { if (!o) setScoring(null); }} uid={uid} interview={scoring} candidateName={scoring.candidate_name} existing={cardOf(scoring)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["scorecards"] })} />}
    </div>
  );
}

/** Compact "next interview" banner for dashboards; renders nothing when none is upcoming. */
export function NextInterviewBanner({ uid, role }: { uid: string; role: Role }) {
  const q = useQuery({ queryKey: ["my-interviews", uid, role], queryFn: () => listMyInterviews(uid, role), staleTime: 60000 });
  const { upcoming } = splitInterviews(q.data ?? []);
  const i = upcoming[0];
  if (!i) return null;
  return (
    <section aria-label="Next interview" className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-primary/30 bg-primary-soft/60 p-4 shadow-soft">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground"><CalendarClock className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Next interview · {countdown(i.scheduled_at, i.duration_minutes)}</p>
        <p className="truncate font-semibold"><JobTitle i={i} role={role} /> <span className="font-normal text-muted-foreground">· <Who i={i} role={role} /></span></p>
        <p className="text-sm text-muted-foreground">{fmtInterview(i.scheduled_at)} · {i.duration_minutes} min{upcoming.length > 1 ? ` · +${upcoming.length - 1} more` : ""}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <JoinButton i={i} />
        <AddToCalendar i={i} title={calTitle(i, role)} />
        <Link to={role === "candidate" ? "/candidate/interviews" : "/recruiter/interviews"} className="inline-flex h-9 items-center rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:border-primary hover:text-primary">All interviews</Link>
      </div>
    </section>
  );
}

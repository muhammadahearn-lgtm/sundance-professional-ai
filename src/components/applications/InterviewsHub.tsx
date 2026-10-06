import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Building2, CalendarClock, CalendarDays, CalendarPlus, Check, ClipboardCheck, Clock, Copy, MapPin, Pencil, Sparkles, Star, Video } from "lucide-react";
import { toast } from "sonner";
import { SearchSelect } from "@/components/ui/search-select";
import { AddToCalendar, ScheduleInterviewDialog, ScorecardDialog, recommendationLabel } from "@/components/applications/Interviews";
import { PLATFORMS, countdown, fmtInterview, roundLabel, splitInterviews } from "@/lib/interview-rules";
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
  return <span className="font-semibold">{i.company_name || "Recruiter"}</span>;
}

function Spotlight({ i, role, onEdit, rounds }: { i: InterviewRow; role: Role; onEdit?: (() => void) | undefined; rounds: InterviewRow[] }) {
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
          <h2 className="mt-1 font-display text-2xl font-extrabold">{i.job_title}</h2>
          <p className="text-sm text-muted-foreground"><Who i={i} role={role} /> · {roundLabel(i)}</p>
          <Journey rounds={rounds} current={i.interview_id} />
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4 text-primary" />{fmtInterview(i.scheduled_at)} · {i.duration_minutes} min</span>
            <span className="inline-flex items-center gap-1">{online ? <Video className="h-4 w-4 text-primary" /> : <MapPin className="h-4 w-4 text-primary" />}{online ? lbl(PLATFORMS, i.platform) : i.location_address}</span>
          </p>
          {i.location_instructions && <p className="mt-1 text-xs text-muted-foreground">{i.location_instructions}</p>}
          {i.notes && <p className="mt-3 whitespace-pre-line rounded-xl bg-muted/60 p-3 text-sm">{i.notes}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <JoinButton i={i} />
            {online && <button type="button" onClick={() => { navigator.clipboard.writeText(i.meeting_url); toast.success("Link copied"); }} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:border-primary hover:text-primary"><Copy className="h-4 w-4" />Copy link</button>}
            <AddToCalendar i={i} title={calTitle(i, role)} />
            {onEdit && <EditButton onClick={onEdit} />}
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ i, role, past, onEdit, card, onScore, onNext }: { i: InterviewRow; role: Role; past?: boolean; onEdit?: (() => void) | undefined; card?: Scorecard | undefined; onScore?: (() => void) | undefined; onNext?: (() => void) | undefined }) {
  const online = i.format === "online";
  return (
    <li className={`flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-soft ${past ? "opacity-75" : ""}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">{online ? <Video className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{i.job_title} <span className="font-normal text-muted-foreground">· {roundLabel(i)}</span></p>
        <p className="truncate text-sm text-muted-foreground"><Who i={i} role={role} /> · {fmtInterview(i.scheduled_at)} · {i.duration_minutes} min · {online ? lbl(PLATFORMS, i.platform) : "In person"}</p>
      </div>
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
  const filtered = all.filter((i) => (!co || i.company_name === co) && (!job || i.job_id === job));
  const { upcoming, past } = splitInterviews(filtered);
  const next = upcoming[0];
  const list = tab === "upcoming" ? upcoming : past;
  const qc = useQueryClient();
  const [editing, setEditing] = useState<InterviewRow | null>(null);
  const editFor = (i: InterviewRow) => (role === "recruiter" ? () => setEditing(i) : undefined);
  const sc = useQuery({ queryKey: ["scorecards", uid], queryFn: () => listMyScorecards(uid), enabled: role === "recruiter" });
  const cardOf = (i: InterviewRow) => (sc.data ?? []).find((c) => c.interview_id === i.interview_id);
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

      {q.isLoading ? <div className="h-48 animate-pulse rounded-3xl bg-muted" /> : next ? <Spotlight i={next} role={role} onEdit={editFor(next)} rounds={roundsOf(next)} /> : (
        <section className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <CalendarClock className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 font-display text-lg font-bold">No upcoming interviews</p>
          <p className="text-sm text-muted-foreground">{role === "candidate" ? "When a recruiter schedules an interview, it shows up here with the link and calendar options." : "Schedule interviews from your Pipeline board — they'll appear here."}</p>
          {role === "recruiter" && <Link to="/recruiter/pipeline" className="mt-4 inline-flex h-9 items-center rounded-xl bg-gradient-primary px-4 text-sm font-bold text-primary-foreground">Open Pipeline</Link>}
        </section>
      )}

      <p className="flex items-center gap-2 rounded-xl bg-primary-soft/60 px-3 py-2 text-xs text-muted-foreground"><Bell className="h-4 w-4 text-primary" />Tip: add interviews to your calendar — each entry reminds you 1 hour and 15 minutes before it starts.</p>

      <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit" role="tablist">
        {(["upcoming", "past"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${tab === t ? "bg-card text-primary shadow-soft" : "text-muted-foreground"}`}>
            {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
          </button>
        ))}
      </div>
      {list.length ? <ul className="space-y-3">{list.map((i) => <Row key={i.interview_id} i={i} role={role} past={tab === "past"} onEdit={editFor(i)}
          card={cardOf(i)} onScore={role === "recruiter" ? () => setScoring(i) : undefined} onNext={role === "recruiter" && tab === "past" && isLatest(i) ? () => setNextFor(i) : undefined} />)}</ul>
        : <p className="text-sm text-muted-foreground">{tab === "upcoming" ? "No upcoming interviews yet." : "No past interviews yet."}</p>}
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
        <p className="truncate font-semibold">{i.job_title} <span className="font-normal text-muted-foreground">· <Who i={i} role={role} /></span></p>
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

import { useState } from "react";
import { toast } from "sonner";
import { Building2, CalendarPlus, ChevronDown, ClipboardCheck, Copy, Lock, MapPin, Sparkles, Star, Video, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DatePicker } from "@/components/ui/date-picker";
import { inputCls, friendlyError } from "@/components/profile/parts";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground";
import { CUSTOM_TYPE, interviewTypeLabel, DURATIONS, INTERVIEW_TYPES, PLATFORMS, RECOMMENDATIONS, detectPlatform, nextRound, roundLabel, validateScorecard, type ScorecardDraft, fmtInterview, googleCalendarUrl, interviewIcs, outlookCalendarUrl, validateInterview, type InterviewDraft, canCandidateChange, validateCancelReason } from "@/lib/interview-rules";
import { cancelInterview, candidateCancelInterview, requestReschedule, saveInterview, saveScorecard, type Interview, type Scorecard } from "@/lib/interviews-data";
import { normalizePlan, type PlanRound } from "@/lib/interview-plan";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** The job's interview kit (focus + rubric) for this round, shown inside the scorecard. */
function InterviewKit({ interview, onCite }: { interview: Interview; onCite: (text: string, field: "strengths" | "concerns") => void }) {
  const q = useQuery({
    queryKey: ["job-plan", interview.job_id], enabled: !!interview.job_id,
    queryFn: async () => { const { data } = await supabase.from("jobs").select("interview_plan").eq("job_id", interview.job_id!).maybeSingle(); return normalizePlan(data?.interview_plan); },
  });
  const round = q.data?.[(interview.round_number ?? 1) - 1];
  if (!round || (!round.focus && !round.rubric?.length)) return null;
  return (
    <div className="rounded-xl border border-primary/30 bg-primary-soft/40 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Interview kit · {round.name}</p>
      {round.focus && <p className="mt-0.5 text-sm font-semibold">Focus: {round.focus}</p>}
      {!!round.rubric?.length && <ul className="mt-2 space-y-1">{round.rubric.map((r) => (
        <li key={r} className="flex items-center gap-2 text-sm"><span className="min-w-0 flex-1">• {r}</span>
          <button type="button" onClick={() => onCite(r, "strengths")} className="rounded-md px-1.5 text-[11px] font-semibold text-success hover:bg-success/10">+ Strength</button>
          <button type="button" onClick={() => onCite(r, "concerns")} className="rounded-md px-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/10">+ Concern</button>
        </li>))}</ul>}
    </div>
  );
}
import { AddressAutocomplete } from "@/components/location/AddressAutocomplete";

const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const pad = (n: number) => String(n).padStart(2, "0");
const lbl = (list: [string, string][], k: string) => list.find(([v]) => v === k)?.[1] ?? k;

function draftFrom(i?: Interview, prior: Interview[] = [], plan: PlanRound[] = []): InterviewDraft {
  if (!i) { const t = new Date(Date.now() + 86400000); const nr = nextRound(prior); const p = plan[nr.round_number - 1]; const asType = p && p.type !== CUSTOM_TYPE && interviewTypeLabel(p.type) === p.name; const planned = p ? { interview_type: asType ? p.type : CUSTOM_TYPE, custom_round_name: asType ? "" : p.name } : { interview_type: nr.interview_type }; return { format: "online", ...planned, round_number: nr.round_number, platform: "google_meet", meeting_url: "", location_address: "", location_instructions: "", date: `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`, time: "10:00", duration_minutes: p?.duration_minutes ?? 45, timezone: tz(), notes: "" }; }
  const d = new Date(i.scheduled_at);
  return { format: i.format as InterviewDraft["format"], interview_type: i.interview_type, custom_round_name: i.custom_round_name ?? "", round_number: i.round_number ?? 1, platform: i.platform || "google_meet", meeting_url: i.meeting_url, location_address: i.location_address, location_instructions: i.location_instructions, date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, duration_minutes: i.duration_minutes, timezone: i.timezone, notes: i.notes };
}

export function ScheduleInterviewDialog({ open, onOpenChange, ctx, existing, candidateName, onSaved, priorRounds = [], plan = [] }: {
  open: boolean; onOpenChange: (o: boolean) => void; candidateName: string; existing?: Interview | undefined; onSaved: () => void; priorRounds?: Interview[]; plan?: PlanRound[];
  ctx: { uid: string; candidateId: string; jobId: string | null; pipelineId: string | null; applicationId: string | null };
}) {
  const [d, setD] = useState<InterviewDraft>(() => draftFrom(existing, priorRounds, plan));
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof InterviewDraft>(k: K, v: InterviewDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  const err = validateInterview(d);
  async function submit() {
    if (err) { toast.error(err); return; }
    setBusy(true);
    try { await saveInterview({ ...ctx, ...(existing ? { interviewId: existing.interview_id } : {}) }, d); toast.success(existing ? "Interview updated" : `Interview scheduled with ${candidateName}`); onSaved(); onOpenChange(false); }
    catch (e) { toast.error(friendlyError(e, "Couldn't save the interview.")); }
    setBusy(false);
  }
  const fmtBtn = (f: InterviewDraft["format"], Icon: typeof Video, title: string, sub: string) => (
    <button type="button" onClick={() => set("format", f)} aria-pressed={d.format === f}
      className={`flex flex-1 items-center gap-3 rounded-xl border p-3 text-left transition-all ${d.format === f ? "border-primary bg-primary-soft shadow-soft" : "border-border bg-card hover:border-primary/50"}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${d.format === f ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><Icon className="h-4 w-4" /></span>
      <span><span className="block text-sm font-bold">{title}</span><span className="block text-xs text-muted-foreground">{sub}</span></span>
    </button>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary"><Sparkles className="h-3 w-3" />Interview Scheduler</span>
          <DialogTitle className="font-display text-xl">{existing ? "Update interview" : "Schedule interview"} with {candidateName}</DialogTitle>
          <DialogDescription>The candidate gets a notification with the details right away.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">{fmtBtn("online", Video, "Online", "Video call link")}{fmtBtn("in_person", Building2, "In person", "Office address")}</div>
          {priorRounds.filter((p) => p.interview_id !== existing?.interview_id).length > 0 && (
            <div className="flex flex-wrap gap-1.5">{priorRounds.filter((p) => p.interview_id !== existing?.interview_id).sort((a, b) => (a.round_number ?? 1) - (b.round_number ?? 1)).map((p) => <span key={p.interview_id} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">✓ {roundLabel(p)}</span>)}</div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid grid-cols-[5.5rem_1fr] gap-2"><div><label className={label}>Round</label><select className={inputCls} value={d.round_number} onChange={(e) => set("round_number", Number(e.target.value))}>{Array.from({ length: 10 }, (_, k) => k + 1).map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
              <div><label className={label}>Interview type</label><select className={inputCls} value={d.interview_type} onChange={(e) => set("interview_type", e.target.value)}>{INTERVIEW_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}<option value={CUSTOM_TYPE}>Custom round name…</option>{![...INTERVIEW_TYPES.map(([k]) => k), CUSTOM_TYPE].includes(d.interview_type) && <option value={d.interview_type}>{interviewTypeLabel(d.interview_type)}</option>}</select></div></div>
            {d.interview_type === CUSTOM_TYPE && <div className="sm:col-span-2"><label className={label}>Round name</label><input autoFocus maxLength={60} className={inputCls} placeholder="e.g. Portfolio Review, Take-Home Presentation, Founder Chat" value={d.custom_round_name ?? ""} onChange={(e) => set("custom_round_name", e.target.value)} /><p className="mt-1 text-xs text-muted-foreground">Shown as "Round {d.round_number}: {(d.custom_round_name ?? "").trim() || "…"}" to you and the candidate.</p></div>}
            <div><label className={label}>Duration</label><select className={inputCls} value={d.duration_minutes} onChange={(e) => set("duration_minutes", Number(e.target.value))}>{DURATIONS.map((m) => <option key={m} value={m}>{m} minutes</option>)}</select></div>
            <div><label className={label}>Date</label><DatePicker value={d.date} onChange={(v) => set("date", v)} clearable={false} aria-label="Interview date" /></div>
            <div><label className={label}>Start time</label><input type="time" className={inputCls} value={d.time} onChange={(e) => set("time", e.target.value)} /></div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">Time zone: {d.timezone}</p>
          {d.format === "online" ? (
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <div><label className={label}>Platform</label><select className={inputCls} value={d.platform} onChange={(e) => set("platform", e.target.value)}>{PLATFORMS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              <div><label className={label}>Meeting link</label><input className={inputCls} placeholder="https://meet.google.com/..." value={d.meeting_url} onChange={(e) => { set("meeting_url", e.target.value); if (/^https:\/\//i.test(e.target.value)) set("platform", detectPlatform(e.target.value)); }} /></div>
            </div>
          ) : (
            <>
              <div><label className={label}>Address</label><AddressAutocomplete ariaLabel="Address" placeholder="Start typing, e.g. 100 Main St, Boston" value={d.location_address} onChange={(v) => set("location_address", v)} /></div>
              <div><label className={label}>Arrival instructions (optional)</label><input className={inputCls} placeholder="Check in at 4th floor reception, bring photo ID" value={d.location_instructions} onChange={(e) => set("location_instructions", e.target.value)} /></div>
            </>
          )}
          <div><label className={label}>Note for the candidate (optional)</label><textarea rows={3} className={inputCls} placeholder="Agenda, who they'll meet, how to prepare…" value={d.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          {err && <p className="text-xs font-medium text-destructive">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => onOpenChange(false)} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">Not now</button>
            <button type="button" disabled={busy || !!err} onClick={submit} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-primary px-4 text-sm font-bold text-primary-foreground shadow-soft disabled:opacity-50"><CalendarPlus className="h-4 w-4" />{existing ? "Save changes" : "Schedule"}</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Compact pill shown on pipeline cards. */
export function InterviewPill({ i, onClick }: { i: Interview; onClick?: () => void }) {
  const Icon = i.format === "online" ? Video : MapPin;
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-soft px-2 py-1 text-left text-[11px] font-semibold text-primary hover:border-primary">
      <Icon className="h-3 w-3 shrink-0" /><span className="truncate">R{i.round_number ?? 1} · {fmtInterview(i.scheduled_at)}</span>
    </button>
  );
}

function downloadIcs(i: Interview, title: string) {
  const blob = new Blob([interviewIcs(i, title)], { type: "text/calendar" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "interview.ics"; a.click(); URL.revokeObjectURL(a.href);
}

/** "Add to calendar" menu: Google, Outlook, Apple/other (.ics with 1h + 15min reminders). */
export function AddToCalendar({ i, title, className = "" }: { i: Interview; title: string; className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={`inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:border-primary hover:text-primary ${className}`}>
        <CalendarPlus className="h-4 w-4" />Add to calendar<ChevronDown className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem asChild><a href={googleCalendarUrl(i, title)} target="_blank" rel="noreferrer">Google Calendar</a></DropdownMenuItem>
        <DropdownMenuItem asChild><a href={outlookCalendarUrl(i, title)} target="_blank" rel="noreferrer">Outlook</a></DropdownMenuItem>
        <DropdownMenuItem onSelect={() => downloadIcs(i, title)}>Apple Calendar / other (.ics)</DropdownMenuItem>
        <p className="px-2 pb-1 pt-1.5 text-[11px] text-muted-foreground">Includes reminders 1 hour and 15 minutes before.</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Full interview card for candidate and recruiter detail views. */
export function InterviewCard({ i, title, onEdit, onCancelled, candidate, onChanged }: { i: Interview; title: string; onEdit?: () => void; onCancelled?: () => void; candidate?: boolean; onChanged?: () => void }) {
  const online = i.format === "online";
  async function cancel() {
    if (!confirm("Cancel this interview? The candidate will be notified.")) return;
    try { await cancelInterview(i.interview_id); toast.success("Interview cancelled"); onCancelled?.(); } catch (e) { toast.error(friendlyError(e, "Couldn't cancel.")); }
  }
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary-soft via-card to-card p-5 shadow-soft">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">{online ? <Video className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Upcoming interview · {roundLabel(i)}</p>
          <p className="font-display text-lg font-extrabold">{fmtInterview(i.scheduled_at)}</p>
          <p className="text-xs text-muted-foreground">{i.duration_minutes} minutes · {online ? lbl(PLATFORMS, i.platform) : "In person"} · {i.timezone}</p>
          {online ? <p className="mt-2 truncate text-sm"><a href={i.meeting_url} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">{i.meeting_url}</a></p>
            : <><p className="mt-2 flex items-start gap-1 text-sm font-medium"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{i.location_address}</p>{i.location_instructions && <p className="mt-1 text-xs text-muted-foreground">{i.location_instructions}</p>}</>}
          {i.notes && <p className="mt-2 whitespace-pre-line rounded-lg bg-muted/60 p-2 text-sm">{i.notes}</p>}
          <RescheduleBadge i={i} candidate={candidate} />
          <div className="mt-3 flex flex-wrap gap-2">
            {online ? <a href={i.meeting_url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-primary px-3 text-sm font-bold text-primary-foreground"><Video className="h-4 w-4" />Join call</a>
              : <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.location_address)}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-primary px-3 text-sm font-bold text-primary-foreground"><MapPin className="h-4 w-4" />Directions</a>}
            {online && <button type="button" onClick={() => { navigator.clipboard.writeText(i.meeting_url); toast.success("Link copied"); }} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:border-primary hover:text-primary"><Copy className="h-4 w-4" />Copy link</button>}
            <AddToCalendar i={i} title={title} />
            {onEdit && <button type="button" onClick={onEdit} className="inline-flex h-9 items-center rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:border-primary hover:text-primary">Reschedule</button>}
            {candidate && <CandidateInterviewActions i={i} onChanged={onChanged} />}
            {onCancelled && <button type="button" onClick={cancel} className="inline-flex h-9 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:text-destructive"><X className="h-4 w-4" />Cancel</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Private recruiter scorecard for a finished interview. Never shown to candidates. */
export function ScorecardDialog({ open, onOpenChange, uid, interview, candidateName, existing, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; uid: string; interview: Interview; candidateName: string; existing?: Scorecard | undefined; onSaved: () => void;
}) {
  const [d, setD] = useState<ScorecardDraft>(() => existing ? { recommendation: existing.recommendation, rating: existing.rating, strengths: existing.strengths, concerns: existing.concerns, notes: existing.notes } : { recommendation: "", rating: 0, strengths: "", concerns: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const err = validateScorecard(d);
  async function submit() {
    if (err) { toast.error(err); return; }
    setBusy(true);
    try { await saveScorecard(uid, interview.interview_id, d); toast.success("Scorecard saved"); onSaved(); onOpenChange(false); }
    catch (e) { toast.error(friendlyError(e, "Couldn't save the scorecard.")); }
    setBusy(false);
  }
  const tone = (k: string) => k.endsWith("hire") ? "border-success bg-success/10 text-success" : "border-destructive bg-destructive/10 text-destructive";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary"><ClipboardCheck className="h-3 w-3" />Scorecard · {roundLabel(interview)}</span>
          <DialogTitle className="font-display text-xl">How did {candidateName} do?</DialogTitle>
          <DialogDescription className="flex items-center gap-1"><Lock className="h-3 w-3" />Private to you. The candidate never sees this.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <InterviewKit interview={interview} onCite={(t, field) => setD((p) => ({ ...p, [field]: p[field].trim() ? `${p[field].trim()}\n• ${t}: ` : `• ${t}: ` }))} />
          <div><p className={label}>Recommendation</p><div className="grid grid-cols-2 gap-2">{RECOMMENDATIONS.map(([k, l]) => <button key={k} type="button" aria-pressed={d.recommendation === k} onClick={() => setD((p) => ({ ...p, recommendation: k }))} className={`h-10 rounded-xl border text-sm font-bold transition-all ${d.recommendation === k ? tone(k) : "border-border bg-card hover:border-primary/50"}`}>{l}</button>)}</div></div>
          <div><p className={label}>Overall rating</p><div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={`${n} star${n === 1 ? "" : "s"}`} onClick={() => setD((p) => ({ ...p, rating: n }))}><Star className={`h-7 w-7 ${n <= d.rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`} /></button>)}</div></div>
          <div><label className={label}>Strengths</label><textarea rows={2} className={inputCls} placeholder="What stood out?" value={d.strengths} onChange={(e) => setD((p) => ({ ...p, strengths: e.target.value }))} /></div>
          <div><label className={label}>Concerns</label><textarea rows={2} className={inputCls} placeholder="Gaps or follow-ups for the next round" value={d.concerns} onChange={(e) => setD((p) => ({ ...p, concerns: e.target.value }))} /></div>
          <div><label className={label}>Notes (optional)</label><textarea rows={2} className={inputCls} value={d.notes} onChange={(e) => setD((p) => ({ ...p, notes: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => onOpenChange(false)} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">Not now</button>
            <button type="button" disabled={busy || !!err} onClick={submit} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-primary px-4 text-sm font-bold text-primary-foreground shadow-soft disabled:opacity-50"><ClipboardCheck className="h-4 w-4" />Save scorecard</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const recommendationLabel = (k: string) => RECOMMENDATIONS.find(([v]) => v === k)?.[1] ?? k;

/** Amber notice that the candidate asked for a new time. */
export function RescheduleBadge({ i, candidate }: { i: Interview; candidate?: boolean | undefined }) {
  if (!i.reschedule_requested_at) return null;
  return (
    <div className="mt-2 rounded-xl border border-warning/40 bg-warning/10 p-2.5 text-sm">
      <p className="font-semibold text-warning">{candidate ? "You asked for a new time — waiting for the recruiter" : "Candidate asked to reschedule"}</p>
      {i.reschedule_note && <p className="mt-0.5 whitespace-pre-line text-foreground/80">“{i.reschedule_note}”</p>}
    </div>
  );
}

/** Candidate-side "Request reschedule" and "Cancel" with a short note. */
export function CandidateInterviewActions({ i, onChanged }: { i: Interview; onChanged?: (() => void) | undefined }) {
  const [mode, setMode] = useState<null | "move" | "cancel">(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  if (!canCandidateChange(i)) return null;
  async function submit() {
    if (mode === "cancel") { const e = validateCancelReason(text); if (e) { toast.error(e); return; } }
    if (text.length > 500) { toast.error("Keep it under 500 characters."); return; }
    setBusy(true);
    try {
      if (mode === "move") { await requestReschedule(i.interview_id, text); toast.success("Request sent — the recruiter will pick a new time"); }
      else { await candidateCancelInterview(i.interview_id, text); toast.success("Interview cancelled. The recruiter has been told."); }
      setMode(null); setText(""); onChanged?.();
    } catch (e) { toast.error(friendlyError(e, "Couldn't send that.")); }
    setBusy(false);
  }
  const btn = "inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:border-primary hover:text-primary";
  return (
    <>
      {!i.reschedule_requested_at && <button type="button" onClick={() => setMode("move")} className={btn}><CalendarPlus className="h-4 w-4" />Request reschedule</button>}
      <button type="button" onClick={() => setMode("cancel")} className="inline-flex h-9 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:text-destructive"><X className="h-4 w-4" />Can't attend</button>
      <Dialog open={mode !== null} onOpenChange={(o) => { if (!o) { setMode(null); setText(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === "move" ? "Ask for a new time" : "Cancel this interview"}</DialogTitle>
            <DialogDescription>{mode === "move" ? "Your interview stays booked until the recruiter picks a new time. Suggest times that work for you." : "The recruiter will be told right away. To leave the job entirely, withdraw your application instead."}</DialogDescription>
          </DialogHeader>
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={4} className={inputCls} placeholder={mode === "move" ? "e.g. Could we do Thursday or Friday afternoon instead?" : "e.g. I'm unwell and can't make it."} />
          <p className="text-right text-[11px] text-muted-foreground">{text.length}/500</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMode(null)} className={btn}>Back</button>
            <button type="button" disabled={busy} onClick={submit} className={`inline-flex h-9 items-center rounded-xl px-4 text-sm font-bold text-primary-foreground disabled:opacity-60 ${mode === "cancel" ? "bg-destructive" : "bg-gradient-primary"}`}>{mode === "move" ? "Send request" : "Cancel interview"}</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

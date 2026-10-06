import { useState } from "react";
import { toast } from "sonner";
import { Building2, CalendarPlus, ChevronDown, Copy, MapPin, Sparkles, Video, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DatePicker } from "@/components/ui/date-picker";
import { inputCls, friendlyError } from "@/components/profile/parts";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground";
import { DURATIONS, INTERVIEW_TYPES, PLATFORMS, detectPlatform, fmtInterview, googleCalendarUrl, interviewIcs, outlookCalendarUrl, validateInterview, type InterviewDraft } from "@/lib/interview-rules";
import { cancelInterview, saveInterview, type Interview } from "@/lib/interviews-data";
import { AddressAutocomplete } from "@/components/location/AddressAutocomplete";

const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const pad = (n: number) => String(n).padStart(2, "0");
const lbl = (list: [string, string][], k: string) => list.find(([v]) => v === k)?.[1] ?? k;

function draftFrom(i?: Interview): InterviewDraft {
  if (!i) { const t = new Date(Date.now() + 86400000); return { format: "online", interview_type: "screen", platform: "google_meet", meeting_url: "", location_address: "", location_instructions: "", date: `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`, time: "10:00", duration_minutes: 45, timezone: tz(), notes: "" }; }
  const d = new Date(i.scheduled_at);
  return { format: i.format as InterviewDraft["format"], interview_type: i.interview_type, platform: i.platform || "google_meet", meeting_url: i.meeting_url, location_address: i.location_address, location_instructions: i.location_instructions, date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, duration_minutes: i.duration_minutes, timezone: i.timezone, notes: i.notes };
}

export function ScheduleInterviewDialog({ open, onOpenChange, ctx, existing, candidateName, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; candidateName: string; existing?: Interview | undefined; onSaved: () => void;
  ctx: { uid: string; candidateId: string; jobId: string | null; pipelineId: string | null; applicationId: string | null };
}) {
  const [d, setD] = useState<InterviewDraft>(() => draftFrom(existing));
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={label}>Interview type</label><select className={inputCls} value={d.interview_type} onChange={(e) => set("interview_type", e.target.value)}>{INTERVIEW_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
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
      <Icon className="h-3 w-3 shrink-0" /><span className="truncate">{fmtInterview(i.scheduled_at)}</span>
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
export function InterviewCard({ i, title, onEdit, onCancelled }: { i: Interview; title: string; onEdit?: () => void; onCancelled?: () => void }) {
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
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Upcoming interview · {lbl(INTERVIEW_TYPES, i.interview_type)}</p>
          <p className="font-display text-lg font-extrabold">{fmtInterview(i.scheduled_at)}</p>
          <p className="text-xs text-muted-foreground">{i.duration_minutes} minutes · {online ? lbl(PLATFORMS, i.platform) : "In person"} · {i.timezone}</p>
          {online ? <p className="mt-2 truncate text-sm"><a href={i.meeting_url} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">{i.meeting_url}</a></p>
            : <><p className="mt-2 flex items-start gap-1 text-sm font-medium"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{i.location_address}</p>{i.location_instructions && <p className="mt-1 text-xs text-muted-foreground">{i.location_instructions}</p>}</>}
          {i.notes && <p className="mt-2 whitespace-pre-line rounded-lg bg-muted/60 p-2 text-sm">{i.notes}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {online ? <a href={i.meeting_url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-primary px-3 text-sm font-bold text-primary-foreground"><Video className="h-4 w-4" />Join call</a>
              : <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.location_address)}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-primary px-3 text-sm font-bold text-primary-foreground"><MapPin className="h-4 w-4" />Directions</a>}
            {online && <button type="button" onClick={() => { navigator.clipboard.writeText(i.meeting_url); toast.success("Link copied"); }} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:border-primary hover:text-primary"><Copy className="h-4 w-4" />Copy link</button>}
            <AddToCalendar i={i} title={title} />
            {onEdit && <button type="button" onClick={onEdit} className="inline-flex h-9 items-center rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:border-primary hover:text-primary">Reschedule</button>}
            {onCancelled && <button type="button" onClick={cancel} className="inline-flex h-9 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:text-destructive"><X className="h-4 w-4" />Cancel</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

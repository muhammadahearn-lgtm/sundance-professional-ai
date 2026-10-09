import { CalendarClock, Check, AlertTriangle, X, Plus } from "lucide-react";
import type { Interview } from "@/lib/interviews-data";
import { fmtInterview } from "@/lib/interview-rules";
import type { RoundStep } from "@/lib/interview-plan";

const REC: Record<string, string> = { strong_hire: "Strong Hire", hire: "Hire", leaning_no: "Leaning No", strong_no: "Strong No" };

/** Compact per-candidate interview progress shown on pipeline cards. */
export function RoundStepper({ steps, planned, onSchedule, onEdit, onScorecard, canSchedule }: {
  steps: RoundStep<Interview>[]; planned: number; canSchedule: boolean;
  onSchedule: () => void; onEdit: (i: Interview) => void; onScorecard: (i: Interview) => void;
}) {
  const done = steps.filter((s) => s.state === "passed" || s.state === "concern").length;
  const next = steps.find((s) => s.state === "pending");
  const busy = steps.some((s) => s.state === "scheduled");
  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-1.5">
      <div className="mb-1 flex items-center justify-between px-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <span>Interviews</span><span>{done}/{planned} done</span>
      </div>
      <ul className="space-y-0.5">
        {steps.map((s) => {
          const base = "flex w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[11px]";
          const label = <span className="min-w-0 flex-1 truncate"><b>R{s.round}</b> {s.name}</span>;
          if (s.state === "passed" || s.state === "concern") {
            const ok = s.state === "passed";
            return <li key={s.round}><button type="button" onClick={() => s.interview && onScorecard(s.interview)} title="View scorecard" className={`${base} ${ok ? "text-success hover:bg-success/10" : "text-destructive hover:bg-destructive/10"}`}>
              {ok ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}{label}<span className="shrink-0 text-[10px] font-semibold">{REC[s.recommendation ?? ""] ?? ""}{s.rating ? ` · ${s.rating}★` : ""}</span></button></li>;
          }
          if (s.state === "awaiting_scorecard") return <li key={s.round}><button type="button" onClick={() => s.interview && onScorecard(s.interview)} className={`${base} bg-warning/10 font-semibold text-warning hover:bg-warning/20`}><AlertTriangle className="h-3 w-3 shrink-0" />{label}<span className="shrink-0 text-[10px]">Add scorecard</span></button></li>;
          if (s.state === "scheduled") return <li key={s.round}><button type="button" onClick={() => s.interview && onEdit(s.interview)} className={`${base} text-primary hover:bg-primary/10`}><CalendarClock className="h-3 w-3 shrink-0" />{label}<span className="shrink-0 text-[10px] font-semibold">{s.interview ? fmtInterview(s.interview.scheduled_at) : ""}</span></button></li>;
          return <li key={s.round} className={`${base} text-muted-foreground`}><span className="grid h-3 w-3 shrink-0 place-items-center rounded-full border border-current" />{label}</li>;
        })}
      </ul>
      {canSchedule && !busy && (
        <button type="button" onClick={onSchedule} className="mt-1 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:border-primary hover:text-primary">
          <Plus className="h-3 w-3" />{next ? `Schedule R${next.round}: ${next.name}` : "Add extra round"}
        </button>
      )}
      {!next && !busy && done >= planned && steps.every((s) => s.state !== "awaiting_scorecard") && <p className="mt-1 text-center text-[10px] font-semibold text-success">All rounds complete — ready to shortlist</p>}
    </div>
  );
}

/** Shortlisted cards: finalist consensus, offer as the primary action, optional follow-up chat. */
export function ShortlistSummary({ steps, planned, onOffer, onFollowUp, onEdit, onScorecard }: {
  steps: RoundStep<Interview>[]; planned: number; onOffer?: (() => void) | undefined; onFollowUp: () => void; onEdit: (i: Interview) => void; onScorecard: (i: Interview) => void;
}) {
  const scored = steps.filter((s) => s.state === "passed" || s.state === "concern");
  const passed = scored.filter((s) => s.state === "passed").length;
  const ratings = scored.map((s) => s.rating ?? 0).filter((r) => r > 0);
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
  const missing = steps.find((s) => s.state === "awaiting_scorecard");
  const upcoming = steps.find((s) => s.state === "scheduled");
  const complete = scored.length >= planned && passed === scored.length && !missing;
  return (
    <div className="mt-2 space-y-1.5">
      {scored.length === 0 && !upcoming && !missing
        ? <p className="rounded-lg bg-primary-soft px-2 py-1 text-center text-[11px] font-semibold text-primary">Shortlisted finalist</p>
        : <p className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-center text-[11px] font-semibold ${complete ? "bg-success/10 text-success" : scored.length > passed ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
            {complete ? <Check className="h-3 w-3" /> : scored.length > passed ? <AlertTriangle className="h-3 w-3" /> : null}
            {passed}/{planned} rounds passed{avg ? ` · ${avg}★` : ""}{complete ? " · Ready for offer" : ""}
          </p>}
      {missing?.interview && <button type="button" onClick={() => onScorecard(missing.interview!)} className="flex w-full items-center justify-center gap-1 rounded-lg bg-warning/10 px-2 py-1 text-[11px] font-semibold text-warning hover:bg-warning/20"><AlertTriangle className="h-3 w-3" />R{missing.round} needs a scorecard</button>}
      {upcoming?.interview && <button type="button" onClick={() => onEdit(upcoming.interview!)} className="flex w-full items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"><CalendarClock className="h-3 w-3" />{upcoming.name} · {fmtInterview(upcoming.interview.scheduled_at)}</button>}
      {onOffer && <button type="button" onClick={onOffer} className="flex w-full items-center justify-center gap-1 rounded-lg bg-gradient-primary px-2 py-1.5 text-xs font-bold text-primary-foreground shadow-soft hover:opacity-90">Prepare Offer →</button>}
      {!upcoming && <button type="button" onClick={onFollowUp} className="flex w-full items-center justify-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-primary"><Plus className="h-3 w-3" />Schedule follow-up / executive chat</button>}
    </div>
  );
}

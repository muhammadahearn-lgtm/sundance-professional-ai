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

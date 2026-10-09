import { useState } from "react";
import { ChevronDown, Minus, Plus, X } from "lucide-react";
import { inputCls } from "@/components/profile/parts";
import { INTERVIEW_TYPES, CUSTOM_TYPE } from "@/lib/interview-rules";
import { FOCUS_MAX, PLAN_DURATIONS, PLAN_MAX, PLAN_MIN, RUBRIC_ITEM_MAX, RUBRIC_MAX, defaultKit, resizePlan, type PlanRound } from "@/lib/interview-plan";

/** Per-job interview plan: number of rounds, each with a name, type, duration and optional interview kit. */
export function InterviewPlanPanel({ value, onChange, error }: { value: PlanRound[]; onChange: (v: PlanRound[]) => void; error?: string | undefined }) {
  const [open, setOpen] = useState<number | null>(null);
  const setRow = (i: number, patch: Partial<PlanRound>) => onChange(value.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const btn = "grid h-8 w-8 place-items-center rounded-lg border border-border hover:border-primary hover:text-primary disabled:opacity-40";
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-semibold">Interview Plan</p><p className="text-xs text-muted-foreground">Rounds candidates go through, each with an optional interview kit shown in the scorecard. Editable anytime.</p></div>
        <div className="flex items-center gap-2" aria-label="Number of rounds">
          <button type="button" className={btn} disabled={value.length <= PLAN_MIN} onClick={() => onChange(resizePlan(value, value.length - 1))} aria-label="Remove round"><Minus className="h-4 w-4" /></button>
          <span className="w-16 text-center text-sm font-bold">{value.length} round{value.length === 1 ? "" : "s"}</span>
          <button type="button" className={btn} disabled={value.length >= PLAN_MAX} onClick={() => onChange(resizePlan(value, value.length + 1))} aria-label="Add round"><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      <ol className="mt-3 space-y-2">
        {value.map((r, i) => {
          const rubric = r.rubric ?? [];
          return (
          <li key={i} className="rounded-xl border border-border/60 p-2">
            <div className="grid grid-cols-[2rem_1fr] items-center gap-2 sm:grid-cols-[2rem_10rem_1fr_8rem]">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">R{i + 1}</span>
              <select aria-label={`Round ${i + 1} type`} className={inputCls} value={r.type} onChange={(e) => { const t = e.target.value; const l = INTERVIEW_TYPES.find(([k]) => k === t)?.[1]; const kit = defaultKit(t); setRow(i, { type: t, ...(l ? { name: l } : {}), ...(!rubric.length && !r.focus ? { focus: kit.focus, rubric: [...kit.rubric] } : {}) }); }}>
                {INTERVIEW_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}<option value={CUSTOM_TYPE}>Custom</option>
              </select>
              <input aria-label={`Round ${i + 1} name`} maxLength={60} className={`${inputCls} col-span-2 sm:col-span-1`} value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="Round name" />
              <select aria-label={`Round ${i + 1} duration`} className={`${inputCls} col-span-2 sm:col-span-1`} value={r.duration_minutes} onChange={(e) => setRow(i, { duration_minutes: Number(e.target.value) })}>
                {[...new Set([...PLAN_DURATIONS, r.duration_minutes])].map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
            <button type="button" onClick={() => setOpen(open === i ? null : i)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              <ChevronDown className={`h-3 w-3 transition-transform ${open === i ? "rotate-180" : ""}`} />Interview kit {rubric.length ? `(${rubric.length} criteria)` : "(none)"}
            </button>
            {open === i && (
              <div className="mt-2 space-y-2 border-t border-border pt-2">
                <input aria-label={`Round ${i + 1} focus`} maxLength={FOCUS_MAX} className={inputCls} value={r.focus ?? ""} onChange={(e) => setRow(i, { focus: e.target.value })} placeholder="Focus of this round (e.g. Architecture and trade-offs)" />
                {rubric.map((c, k) => (
                  <div key={k} className="flex gap-2">
                    <input aria-label={`Criterion ${k + 1}`} maxLength={RUBRIC_ITEM_MAX} className={inputCls} value={c} onChange={(e) => setRow(i, { rubric: rubric.map((x, j) => (j === k ? e.target.value : x)) })} placeholder="Question or criterion" />
                    <button type="button" aria-label="Remove criterion" className={btn} onClick={() => setRow(i, { rubric: rubric.filter((_, j) => j !== k) })}><X className="h-4 w-4" /></button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-3 text-xs font-semibold">
                  {rubric.length < RUBRIC_MAX && <button type="button" className="text-primary hover:underline" onClick={() => setRow(i, { rubric: [...rubric, ""] })}>+ Add criterion</button>}
                  {r.type !== CUSTOM_TYPE && <button type="button" className="text-muted-foreground hover:text-primary" onClick={() => { const kit = defaultKit(r.type); setRow(i, { focus: kit.focus, rubric: [...kit.rubric] }); }}>Reset to suggested kit</button>}
                </div>
              </div>
            )}
          </li>);
        })}
      </ol>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

import { Minus, Plus } from "lucide-react";
import { inputCls } from "@/components/profile/parts";
import { INTERVIEW_TYPES, CUSTOM_TYPE } from "@/lib/interview-rules";
import { PLAN_DURATIONS, PLAN_MAX, PLAN_MIN, resizePlan, type PlanRound } from "@/lib/interview-plan";

/** Per-job interview plan: number of rounds, each with a name, type and duration. */
export function InterviewPlanPanel({ value, onChange, error }: { value: PlanRound[]; onChange: (v: PlanRound[]) => void; error?: string | undefined }) {
  const setRow = (i: number, patch: Partial<PlanRound>) => onChange(value.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const btn = "grid h-8 w-8 place-items-center rounded-lg border border-border hover:border-primary hover:text-primary disabled:opacity-40";
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-semibold">Interview Plan</p><p className="text-xs text-muted-foreground">Rounds candidates go through. Pipeline cards track progress against this plan. Editable anytime.</p></div>
        <div className="flex items-center gap-2" aria-label="Number of rounds">
          <button type="button" className={btn} disabled={value.length <= PLAN_MIN} onClick={() => onChange(resizePlan(value, value.length - 1))} aria-label="Remove round"><Minus className="h-4 w-4" /></button>
          <span className="w-16 text-center text-sm font-bold">{value.length} round{value.length === 1 ? "" : "s"}</span>
          <button type="button" className={btn} disabled={value.length >= PLAN_MAX} onClick={() => onChange(resizePlan(value, value.length + 1))} aria-label="Add round"><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      <ol className="mt-3 space-y-2">
        {value.map((r, i) => (
          <li key={i} className="grid grid-cols-[2rem_1fr] items-center gap-2 sm:grid-cols-[2rem_10rem_1fr_8rem]">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">R{i + 1}</span>
            <select aria-label={`Round ${i + 1} type`} className={inputCls} value={r.type} onChange={(e) => { const t = e.target.value; const l = INTERVIEW_TYPES.find(([k]) => k === t)?.[1]; setRow(i, { type: t, ...(l ? { name: l } : {}) }); }}>
              {INTERVIEW_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}<option value={CUSTOM_TYPE}>Custom</option>
            </select>
            <input aria-label={`Round ${i + 1} name`} maxLength={60} className={`${inputCls} col-span-2 sm:col-span-1`} value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="Round name" />
            <select aria-label={`Round ${i + 1} duration`} className={`${inputCls} col-span-2 sm:col-span-1`} value={r.duration_minutes} onChange={(e) => setRow(i, { duration_minutes: Number(e.target.value) })}>
              {[...new Set([...PLAN_DURATIONS, r.duration_minutes])].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </li>
        ))}
      </ol>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

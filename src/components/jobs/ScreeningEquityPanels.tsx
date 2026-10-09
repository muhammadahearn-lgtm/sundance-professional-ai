import { Plus, Trash2, Gem, ListChecks } from "lucide-react";
import { Field, inputCls } from "@/components/profile/parts";
import { EQUITY_TYPES, MAX_QUESTIONS, PRESETS, PRESET_GROUPS, fromPreset, newId, optionsFor, validateQuestions, type QType, type ScreeningQ } from "@/lib/screening";

type EquityVals = { equity_type: string; equity_range: string; equity_vesting: string };

export function EquityPanel({ v, onChange, errs }: { v: EquityVals; onChange: (k: keyof EquityVals, val: string) => void; errs: Partial<Record<string, string>> }) {
  return (
    <section className="rounded-2xl border border-border p-4">
      <h3 className="flex items-center gap-2 font-display font-bold"><Gem className="h-4 w-4 text-primary" />Equity & Stock</h3>
      <p className="mb-3 text-xs text-muted-foreground">Optional. Shown to candidates next to salary — never used in match scores.</p>
      <div role="radiogroup" aria-label="Equity type" className="grid gap-2 sm:grid-cols-4">
        {EQUITY_TYPES.map((t) => (
          <button key={t.value} type="button" role="radio" aria-checked={v.equity_type === t.value} onClick={() => onChange("equity_type", t.value)}
            className={`rounded-xl border p-3 text-left text-sm transition ${v.equity_type === t.value ? "border-primary bg-primary-soft" : "border-border hover:border-primary"}`}>
            <span className="block font-semibold">{t.label}</span><span className="text-xs text-muted-foreground">{t.hint}</span>
          </button>
        ))}
      </div>
      {v.equity_type !== "none" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Range" error={errs["equity_range"]}><input className={inputCls} maxLength={80} value={v.equity_range} onChange={(e) => onChange("equity_range", e.target.value)} placeholder={v.equity_type === "percentage" ? "0.1% – 0.5%" : v.equity_type === "rsu" ? "$40k – $80k / year" : "10,000 – 25,000 options"} /></Field>
          <Field label="Vesting (optional)" error={errs["equity_vesting"]}><input className={inputCls} maxLength={160} value={v.equity_vesting} onChange={(e) => onChange("equity_vesting", e.target.value)} placeholder="4 years, 1-year cliff" /></Field>
        </div>
      )}
    </section>
  );
}

const TYPES: { value: QType; label: string }[] = [{ value: "yes_no", label: "Yes / No" }, { value: "choice", label: "Multiple choice" }, { value: "text", label: "Short answer" }];

export function ScreeningPanel({ value, onChange, error }: { value: ScreeningQ[]; onChange: (v: ScreeningQ[]) => void; error?: string | undefined }) {
  const errs = validateQuestions(value);
  const full = value.length >= MAX_QUESTIONS;
  const upd = (id: string, p: Partial<ScreeningQ>) => onChange(value.map((q) => (q.id === id ? { ...q, ...p } : q)));
  const used = (key: string) => value.some((q) => q.text === PRESETS.find((p) => p.key === key)?.q.text);
  return (
    <section className="rounded-2xl border border-border p-4">
      <h3 className="flex items-center gap-2 font-display font-bold"><ListChecks className="h-4 w-4 text-primary" />Screening Questions</h3>
      <p className="mb-3 text-xs text-muted-foreground">Optional. Candidates answer these when applying. Answers help you review quickly — they never change match scores or auto-reject anyone. Mark a question as a Dealbreaker to flag applicants whose answer differs from your preferred one.</p>
      <p className="mb-2 text-xs font-semibold text-muted-foreground">Templates — add in one click, then edit freely</p>
      <div className="space-y-2">
        {PRESET_GROUPS.map((g) => (
          <div key={g.key} className="flex flex-wrap items-center gap-2">
            <span className="w-full text-[11px] font-bold uppercase tracking-wide text-muted-foreground sm:w-36">{g.label}</span>
            {PRESETS.filter((p) => p.group === g.key).map((p) => (
              <button key={p.key} type="button" disabled={full || used(p.key)} onClick={() => { const q = fromPreset(p.key); if (q) onChange([...value, q]); }} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-primary hover:text-primary disabled:opacity-50"><Plus className="h-3 w-3" />{p.label}</button>
            ))}
          </div>
        ))}
      </div>
      <button type="button" disabled={full} onClick={() => onChange([...value, { id: newId(), text: "", type: "text", options: [], ideal: "", required: true }])} className="mt-3 inline-flex items-center gap-1 rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary disabled:opacity-50"><Plus className="h-3 w-3" />Custom question</button>
      {full && <p className="mt-2 text-xs text-muted-foreground">Up to {MAX_QUESTIONS} questions per job.</p>}
      <ol className="mt-4 space-y-3">
        {value.map((q, i) => (
          <li key={q.id} className="rounded-xl bg-muted/40 p-3">
            <div className="flex items-start gap-2">
              <span className="mt-2 text-xs font-bold text-muted-foreground">{i + 1}.</span>
              <div className="min-w-0 flex-1 space-y-2">
                <input aria-label={`Question ${i + 1}`} className={inputCls} maxLength={300} value={q.text} onChange={(e) => upd(q.id, { text: e.target.value })} placeholder="e.g. Share a link to your GitHub or portfolio" />
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select aria-label="Answer type" className="rounded-lg border border-input bg-background px-2 py-1" value={q.type} onChange={(e) => { const t = e.target.value as QType; upd(q.id, { type: t, ideal: "", knockout: false, options: t === "choice" && q.options.length < 2 ? ["", ""] : q.options }); }}>
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {q.type !== "text" && (
                    <select aria-label="Preferred answer" className="rounded-lg border border-input bg-background px-2 py-1" value={q.ideal} onChange={(e) => upd(q.id, { ideal: e.target.value, ...(e.target.value ? {} : { knockout: false }) })}>
                      <option value="">No preferred answer</option>
                      {optionsFor(q).filter((o) => o.trim()).map((o) => <option key={o} value={o}>Prefer: {o}</option>)}
                    </select>
                  )}
                  <label className="inline-flex items-center gap-1"><input type="checkbox" checked={q.required} onChange={(e) => upd(q.id, { required: e.target.checked })} />Required</label>
                  {q.type !== "text" && <label className="inline-flex items-center gap-1" title="Flags applicants whose answer differs from the preferred one"><input type="checkbox" disabled={!q.ideal} checked={!!q.knockout} onChange={(e) => upd(q.id, { knockout: e.target.checked })} />Dealbreaker</label>}
                </div>
                {q.type === "choice" && (
                  <div className="space-y-1">
                    {q.options.map((o, oi) => (
                      <div key={oi} className="flex gap-1">
                        <input aria-label={`Option ${oi + 1}`} className={`${inputCls} py-1 text-xs`} maxLength={80} value={o} onChange={(e) => upd(q.id, { options: q.options.map((x, xi) => (xi === oi ? e.target.value : x)) })} placeholder={`Option ${oi + 1}`} />
                        <button type="button" aria-label="Remove option" onClick={() => upd(q.id, { options: q.options.filter((_, xi) => xi !== oi) })} className="px-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                    {q.options.length < 8 && <button type="button" onClick={() => upd(q.id, { options: [...q.options, ""] })} className="text-xs font-semibold text-primary">+ Add option</button>}
                  </div>
                )}
                {errs[q.id] && <p className="text-xs text-destructive">{errs[q.id]}</p>}
              </div>
              <button type="button" aria-label="Remove question" onClick={() => onChange(value.filter((x) => x.id !== q.id))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </li>
        ))}
      </ol>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </section>
  );
}

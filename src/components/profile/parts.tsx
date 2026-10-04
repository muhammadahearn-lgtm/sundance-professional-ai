import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { friendlyAuthError } from "@/lib/auth-rules";

export const card = "rounded-2xl border border-border bg-card shadow-soft";
export const inputCls = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export const AVAILABILITY: [string, string][] = [["active", "Actively Looking"], ["open", "Open To Opportunities"], ["not_looking", "Not Looking"]];
export const ARRANGEMENTS: [string, string][] = [["remote", "Remote"], ["hybrid", "Hybrid"], ["onsite", "On-Site"]];
export const PROFICIENCY = ["beginner", "intermediate", "advanced", "expert"] as const;
export type Proficiency = (typeof PROFICIENCY)[number];
export const label = (opts: [string, string][], v: string) => opts.find(([k]) => k === v)?.[1] ?? v;
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function friendlyError(e: unknown, fallback: string): string {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "";
  if (/failed to fetch|network/i.test(msg)) return "Connection error. Check your internet and try again.";
  if (/jwt|session|expired/i.test(msg)) return "Your session expired. Please log in again.";
  if (msg && friendlyAuthError(msg) !== msg) return friendlyAuthError(msg);
  return fallback;
}

export function Section({ title, icon, action, children, id }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; id?: string }) {
  const [open, setOpen] = useState(true);
  return (
    <section id={id} className={card}>
      <div className="flex items-center justify-between gap-3 p-5 sm:p-6">
        <button type="button" onClick={() => setOpen(!open)} className="flex min-w-0 items-center gap-3 text-left" aria-expanded={open}>
          {icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">{icon}</span>}
          <h2 className="truncate font-display text-lg font-bold">{title}</h2>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
        {open && action}
      </div>
      {open && <div className="border-t border-border p-5 sm:p-6">{children}</div>}
    </section>
  );
}

export function Field({ label: l, error, children, hint }: { label: string; error?: string | undefined; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex justify-between text-sm font-medium">{l}{hint}</span>
      {children}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}

export function SaveBar({ saving, onCancel, label: l = "Save Changes" }: { saving: boolean; onCancel: () => void; label?: string }) {
  return (
    <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 flex justify-end gap-2 border-t border-border bg-card/95 p-4 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:p-0">
      <button type="button" onClick={onCancel} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
      <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">{saving ? "Saving…" : l}</button>
    </div>
  );
}

export function Chips({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-sm text-muted-foreground">—</span>;
  return <div className="flex flex-wrap gap-1.5">{items.map((t) => <span key={t} className="rounded-full border border-border px-3 py-1 text-xs font-medium">{t}</span>)}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">{children}</p>;
}

export function TagInput({ value, onChange, options, placeholder }: { value: string[]; onChange: (v: string[]) => void; options?: string[]; placeholder?: string }) {
  const [q, setQ] = useState("");
  const add = (t: string) => { const v = t.trim(); if (v && !value.includes(v)) onChange([...value, v]); setQ(""); };
  const sugg = (options ?? []).filter((o) => !value.includes(o) && o.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <div className="space-y-2">
      {value.length > 0 && <div className="flex flex-wrap gap-1.5">{value.map((t) => (
        <button type="button" key={t} onClick={() => onChange(value.filter((x) => x !== t))} className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">{t} ×</button>
      ))}</div>}
      <input className={inputCls} value={q} placeholder={placeholder} onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (options && !options.length) return; add(options ? (sugg[0] ?? "") : q); } }} />
      {q && sugg.length > 0 && <div className="flex flex-wrap gap-1.5">{sugg.map((s) => (
        <button type="button" key={s} onClick={() => add(s)} className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary hover:text-primary">+ {s}</button>
      ))}</div>}
    </div>
  );
}

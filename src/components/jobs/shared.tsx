import { useState } from "react";
import { X } from "lucide-react";
import type { JobStatus, ReqItem, ReqLevel } from "@/lib/job-rules";
import { inputCls } from "@/components/profile/parts";

export const EMPLOYMENT: [string, string][] = [["full_time", "Full-Time"], ["part_time", "Part-Time"], ["contract", "Contract"], ["internship", "Internship"], ["consulting", "Consulting"]];
export const ARRANGEMENT: [string, string][] = [["remote", "Remote"], ["hybrid", "Hybrid"], ["on_site", "On-Site"]];
export const LEVELS = ["Entry-Level", "Mid-Level", "Senior-Level", "Lead", "Principal", "Manager", "Director"];
export const CURRENCIES = ["USD", "CAD", "EUR", "GBP", "AUD", "INR"];
export const REQ_LEVELS: [ReqLevel, string][] = [["required", "Required"], ["preferred", "Preferred"], ["optional", "Optional"]];
export const lbl = (opts: [string, string][], v: string) => opts.find(([k]) => k === v)?.[1] ?? v;

export const STATUS_STYLE: Record<JobStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/15 text-success",
  paused: "bg-warning/15 text-warning",
  closed: "bg-destructive/10 text-destructive",
};
export function StatusBadge({ s }: { s: JobStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${STATUS_STYLE[s]}`}>{s}</span>;
}

export function formatSalary(min: number | null, max: number | null, cur: string) {
  const f = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD", maximumFractionDigits: 0 }).format(n);
  if (min !== null && max !== null) return `${f(min)} – ${f(max)}`;
  if (min !== null) return `From ${f(min)}`;
  if (max !== null) return `Up to ${f(max)}`;
  return "";
}

type Opt = { id: string; name: string; group?: string };

/** Searchable multi-select where every selection carries Required / Preferred / Optional. */
export function RequirementPicker({ options, value, onChange, placeholder }: { options: Opt[]; value: ReqItem[]; onChange: (v: ReqItem[]) => void; placeholder: string }) {
  const [q, setQ] = useState("");
  const chosen = new Set(value.map((v) => v.id));
  const matches = options.filter((o) => !chosen.has(o.id) && (o.name.toLowerCase().includes(q.toLowerCase()) || (o.group ?? "").toLowerCase().includes(q.toLowerCase()))).slice(0, q ? 12 : 16);
  const name = (id: string) => options.find((o) => o.id === id)?.name ?? "Unknown";
  return (
    <div className="space-y-4">
      <div>
        <input className={inputCls} value={q} placeholder={placeholder} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const m = matches[0]; if (m) { onChange([...value, { id: m.id, level: "required" }]); setQ(""); } } }} />
        {matches.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{matches.map((o) => (
          <button type="button" key={o.id} onClick={() => { onChange([...value, { id: o.id, level: "required" }]); setQ(""); }} className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary hover:text-primary">+ {o.name}</button>
        ))}</div>}
      </div>
      {value.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {value.map((v) => (
            <li key={v.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-semibold">{name(v.id)}</span>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label={`${name(v.id)} requirement`}>
                  {REQ_LEVELS.map(([k, l]) => (
                    <button type="button" key={k} role="radio" aria-checked={v.level === k} onClick={() => onChange(value.map((x) => (x.id === v.id ? { ...x, level: k } : x)))}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold ${v.level === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
                  ))}
                </div>
                <button type="button" aria-label={`Remove ${name(v.id)}`} onClick={() => onChange(value.filter((x) => x.id !== v.id))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"><X className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RequirementList({ items, options }: { items: ReqItem[]; options: Opt[] }) {
  if (!items.length) return <span className="text-sm text-muted-foreground">—</span>;
  const order: Record<ReqLevel, number> = { required: 0, preferred: 1, optional: 2 };
  return (
    <div className="flex flex-wrap gap-1.5">
      {[...items].sort((a, b) => order[a.level] - order[b.level]).map((i) => (
        <span key={i.id} className={`rounded-full border px-3 py-1 text-xs font-medium ${i.level === "required" ? "border-primary bg-primary-soft text-primary" : "border-border"}`}>
          {options.find((o) => o.id === i.id)?.name ?? "—"}{i.level !== "required" && <span className="ml-1 text-muted-foreground">· {i.level}</span>}
        </span>
      ))}
    </div>
  );
}

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { searchOptions } from "@/lib/role-taxonomy";
import { newRoleName } from "@/lib/role-add";
import { inputCls } from "@/components/profile/parts";

type Opt = { id: string; name: string; category?: string };

/** Searchable single-select for controlled lists (roles, levels). Optional governed "+ Add" via onAdd. */
export function SearchPicker({ options: baseOptions, value, onChange, placeholder = "Search…", allowClear = true, emptyLabel, grouped, ariaLabel, onAdd, addHint, nameFor }: {
  options: Opt[]; value: string; onChange: (id: string) => void; placeholder?: string; allowClear?: boolean; emptyLabel?: string; grouped?: boolean; ariaLabel?: string;
  onAdd?: (name: string) => Promise<Opt>; addHint?: string; nameFor?: (q: string, options: Opt[]) => string | null;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const [extra, setExtra] = useState<Opt[]>([]);
  const [adding, setAdding] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = useMemo(() => [...(baseOptions ?? []), ...extra.filter((e) => !(baseOptions ?? []).some((o) => o.id === e.id))], [baseOptions, extra]);
  const selected = options.find((o) => o.id === value);
  const results = useMemo(() => searchOptions(options, q), [options, q]);
  const addName = onAdd ? (nameFor ?? newRoleName)(q, options) : null;

  const pick = (id: string) => { onChange(id); setOpen(false); setQ(""); };
  const add = async () => {
    if (!onAdd || !addName || adding) return;
    setAdding(true);
    try { const o = await onAdd(addName); setExtra((x) => [...x, o]); pick(o.id); toast.success(`"${o.name}" added to the list`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't add that entry"); }
    finally { setAdding(false); }
  };
  const groups: [string, Opt[]][] = grouped && !q.trim()
    ? Array.from(results.reduce((m, o) => { const g = o.category || "Other"; m.set(g, [...(m.get(g) ?? []), o]); return m; }, new Map<string, Opt[]>()))
    : [["", results]];
  let idx = -1;

  return (
    <div ref={ref} className="relative" onBlur={(e) => { if (!ref.current?.contains(e.relatedTarget as Node)) { setOpen(false); setQ(""); } }}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          role="combobox" aria-expanded={open} aria-label={ariaLabel}
          className={`${inputCls} pl-9 pr-16`}
          value={open ? q : selected?.name ?? ""}
          placeholder={selected?.name ?? emptyLabel ?? placeholder}
          onFocus={() => { setOpen(true); setHi(0); }}
          onClick={(e) => { e.preventDefault(); setOpen(true); }}
          onChange={(e) => { setQ(e.target.value); setHi(0); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); const o = results[hi]; if (o) pick(o.id); else if (addName) void add(); }
            else if (e.key === "Escape") { setOpen(false); setQ(""); }
          }}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {allowClear && value && <button type="button" aria-label="Clear" onClick={(e) => { e.preventDefault(); onChange(""); }} className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-lg" role="listbox">
          {results.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">{onAdd ? "No matches in the list." : "No matches. Pick from the list."}</p>}
          {groups.map(([g, items]) => (
            <div key={g ? `g:${g}` : "results"}>
              {g && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g}</p>}
              {items.map((o) => {
                idx += 1; const i = idx;
                return (
                  <button key={o.id} type="button" role="option" aria-selected={o.id === value}
                    onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); pick(o.id); }} onMouseEnter={() => setHi(i)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${i === hi ? "bg-muted" : ""}`}>
                    <span>{o.name}{q && o.category && <span className="ml-2 text-xs text-muted-foreground">{o.category}</span>}</span>
                    {o.id === value && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          ))}
          {addName && (
            <div className="mt-1 border-t border-border pt-1">
              <button type="button" disabled={adding} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); void add(); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-60">
                <Plus className="h-4 w-4" />{adding ? "Adding…" : <>Add “{addName}”</>}
              </button>
              {addHint && <p className="px-3 pb-1.5 text-[11px] text-muted-foreground">{addHint}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

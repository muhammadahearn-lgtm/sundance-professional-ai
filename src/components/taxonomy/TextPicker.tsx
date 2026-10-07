import { useMemo } from "react";
import { X } from "lucide-react";
import { SearchPicker } from "./SearchPicker";
import { taxonomyDisplay, taxonomyKey } from "@/lib/taxonomy";

/** Name offered on "+ Add", or null when empty, too long or already listed (case/spacing-insensitive). */
export function newTextName(q: string, options: { name: string }[], max = 150): string | null {
  const k = taxonomyKey(q);
  if (!k || q.trim().length < 2 || q.trim().length > max) return null;
  return options.some((o) => taxonomyKey(o.name) === k) ? null : taxonomyDisplay(q);
}

/** Free-text value picked from suggestions with search and "+ Add" — same look as SearchPicker. */
export function TextPicker({ options, value, onChange, placeholder, ariaLabel, addHint, onAdd, nameFor, max = 150 }: {
  options: string[]; value: string; onChange: (v: string) => void; placeholder?: string; ariaLabel?: string; addHint?: string;
  onAdd?: (name: string) => Promise<string>; nameFor?: (q: string, options: { name: string }[]) => string | null; max?: number;
}) {
  const opts = useMemo(() => {
    const all = [...new Set([...options, ...(value ? [value] : [])])];
    return all.map((n) => ({ id: n, name: n }));
  }, [options, value]);
  return (
    <SearchPicker options={opts} value={value} onChange={onChange} placeholder={placeholder} ariaLabel={ariaLabel} addHint={addHint}
      nameFor={nameFor ?? ((q, o) => newTextName(q, o, max))}
      onAdd={async (name) => { const n = onAdd ? await onAdd(name) : name; return { id: n, name: n }; }} />
  );
}

/** Multi-value chips + TextPicker for adding more. */
export function TagPicker({ options, value, onChange, placeholder, ariaLabel, addHint, onAdd, nameFor, max }: {
  options: string[]; value: string[]; onChange: (v: string[]) => void; placeholder?: string; ariaLabel?: string; addHint?: string;
  onAdd?: (name: string) => Promise<string>; nameFor?: (q: string, options: { name: string }[]) => string | null; max?: number;
}) {
  const rest = options.filter((o) => !value.includes(o));
  return (
    <div className="space-y-2">
      {value.length > 0 && <div className="flex flex-wrap gap-1.5">{value.map((t) => (
        <span key={t} className="flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          {t}<button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
        </span>
      ))}</div>}
      <TextPicker options={rest} value="" placeholder={placeholder} ariaLabel={ariaLabel} addHint={addHint} onAdd={onAdd} max={max}
        nameFor={nameFor ? (q, o) => (value.some((v) => taxonomyKey(v) === taxonomyKey(q)) ? null : nameFor(q, o)) : (q, o) => (value.some((v) => taxonomyKey(v) === taxonomyKey(q)) ? null : newTextName(q, o, max))}
        onChange={(v) => { if (v && !value.includes(v)) onChange([...value, v]); }} />
    </div>
  );
}

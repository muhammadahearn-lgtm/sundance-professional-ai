import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { inputCls } from "@/components/profile/parts";

export type AddressSuggestion = { label: string; primary: string; secondary: string; city: string; state: string; country: string };

type Mode = "address" | "city";

type PhotonProps = { name?: string; housenumber?: string; street?: string; city?: string; town?: string; village?: string; state?: string; postcode?: string; country?: string; type?: string };

function toSuggestion(p: PhotonProps, mode: Mode): AddressSuggestion | null {
  const city = p.city || p.town || p.village || (p.type === "city" ? p.name : "") || "";
  const street = p.street ? `${p.housenumber ? p.housenumber + " " : ""}${p.street}` : p.name ?? "";
  const primary = mode === "city" ? (city || p.name || "") : street;
  if (!primary) return null;
  const secondary = (mode === "city" ? [p.state, p.country] : [city, [p.state, p.postcode].filter(Boolean).join(" "), p.country]).filter(Boolean).join(", ");
  return { primary, secondary, label: [primary, secondary].filter(Boolean).join(", "), city, state: p.state ?? "", country: p.country ?? "" };
}

/** Free-text input with live address suggestions (OpenStreetMap). Users can keep typing or pick one. */
export function AddressAutocomplete({ value, onChange, onSelect, mode = "address", placeholder, ariaLabel, className, maxLength, onBlur }: {
  value: string; onChange: (v: string) => void; onSelect?: (s: AddressSuggestion) => void; mode?: Mode;
  placeholder?: string; ariaLabel?: string; className?: string; maxLength?: number; onBlur?: () => void;
}) {
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const typed = useRef(false);
  const listId = useId();

  useEffect(() => {
    const q = value.trim();
    if (!typed.current || q.length < 3) { setItems([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const get = async (query: string, layer: string, limit = 6) => {
          const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=${limit}&lang=en${layer}`, { signal: ctrl.signal });
          return ((await r.json()) as { features?: { properties: PhotonProps }[] }).features?.map((f) => f.properties) ?? [];
        };
        let props: PhotonProps[];
        const num = mode === "address" ? /^(\d+[a-z]?)\s+(.+)$/i.exec(q) : null;
        if (mode === "city") props = await get(q, "&layer=city");
        else if (num) {
          // "16 Sun": the geocoder only prefix-matches street names without a number, so search the street part too and add the number back.
          const [hn, rest] = [num[1]!, num[2]!];
          const region = (typeof navigator !== "undefined" ? /-([A-Z]{2})$/.exec(navigator.language)?.[1] : undefined) ?? "";
          const [full, local, streets] = await Promise.all([get(q, "&layer=house&layer=street"), region ? get(rest, `&layer=street&countrycode=${region}`, 10) : Promise.resolve([]), get(rest, "&layer=street", 10)]);
          const low = rest.toLowerCase();
          const exact = full.filter((p) => p.housenumber === hn && (p.street ?? "").toLowerCase().startsWith(low));
          const named = [...local, ...streets].filter((p) => (p.name ?? "").toLowerCase().startsWith(low)).map(({ name, ...p }): PhotonProps => ({ ...p, street: name ?? "", housenumber: hn }));
          props = [...exact, ...named];
        } else props = await get(q, "&layer=house&layer=street");
        const seen = new Set<string>();
        const out = props.map((p) => toSuggestion(p, mode)).filter((s): s is AddressSuggestion => !!s && !seen.has(s.label) && !!seen.add(s.label)).slice(0, 7);
        setItems(out); setActive(-1); setOpen(true);
      } catch { /* aborted or offline — keep free typing */ }
      finally { setLoading(false); }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value, mode]);

  const pick = (s: AddressSuggestion) => {
    typed.current = false;
    onChange(mode === "city" ? s.city || s.primary : s.label);
    onSelect?.(s);
    setOpen(false); setItems([]);
  };

  return (
    <div className="relative">
      <input
        role="combobox" aria-expanded={open && items.length > 0} aria-controls={listId} aria-autocomplete="list" aria-label={ariaLabel}
        className={className ?? inputCls} value={value} placeholder={placeholder} maxLength={maxLength} autoComplete="off"
        onChange={(e) => { typed.current = true; onChange(e.target.value); }}
        onFocus={() => items.length && setOpen(true)}
        onBlur={() => { setTimeout(() => setOpen(false), 150); onBlur?.(); }}
        onKeyDown={(e) => {
          if (!open || !items.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % items.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)); }
          else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(items[active]!); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {loading && <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      {open && items.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-50 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-soft">
          {items.map((s, i) => (
            <li key={s.label} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(s); }} onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${i === active ? "bg-primary/10" : "hover:bg-muted"}`}>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0"><span className="block truncate font-semibold text-foreground">{s.primary}</span>{s.secondary && <span className="block truncate text-xs text-muted-foreground">{s.secondary}</span>}</span>
            </li>
          ))}
          <li className="px-2.5 pb-1 pt-1.5 text-[10px] text-muted-foreground">Keep typing to use your own address · © OpenStreetMap</li>
        </ul>
      )}
    </div>
  );
}

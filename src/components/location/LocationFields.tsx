import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddressAutocomplete } from "@/components/location/AddressAutocomplete";
import { SearchPicker } from "@/components/taxonomy/SearchPicker";
import { inputCls } from "@/components/profile/parts";
import { formatLocation, normalizeLocationPart, type LocationParts } from "@/lib/location";

export function useCountries() {
  return useQuery({
    queryKey: ["countries"],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from("countries").select("country_name, sort_order").order("sort_order").order("country_name");
      if (error) throw error;
      return (data ?? []).map((c) => c.country_name);
    },
  });
}

const lab = "mb-1.5 block text-sm font-medium";

/** Country (controlled list) + State / Province + City (free text, normalized on blur). */
export function LocationFields({ value, onChange, required, error, showPreview = true }: {
  value: LocationParts; onChange: (v: LocationParts) => void; required?: boolean; error?: string | undefined; showPreview?: boolean;
}) {
  const countries = useCountries().data ?? [];
  const star = required ? " *" : "";
  const preview = formatLocation(value);
  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="grid gap-4 sm:grid-cols-3">
        <div><span className={lab}>Country{star}</span>
          <SearchPicker ariaLabel="Country" options={countries.map((c) => ({ id: c, name: c }))} value={value.country} onChange={(c) => onChange({ ...value, country: c })} placeholder="Search countries…" emptyLabel="Select country" />
        </div>
        <label><span className={lab}>State / Province{star}</span>
          <input className={inputCls} maxLength={80} value={value.state} placeholder="e.g. New Hampshire" onChange={(e) => onChange({ ...value, state: e.target.value })} onBlur={() => onChange({ ...value, state: normalizeLocationPart(value.state) })} />
        </label>
        <div><span className={lab}>City{star}</span>
          <AddressAutocomplete mode="city" ariaLabel="City" maxLength={80} value={value.city} placeholder="Start typing, e.g. Bow"
            onChange={(c) => onChange({ ...value, city: c })}
            onBlur={() => onChange({ ...value, city: normalizeLocationPart(value.city) })}
            onSelect={(sg) => onChange({ city: sg.city || sg.primary, state: sg.state || value.state, country: countries.includes(sg.country) ? sg.country : value.country })} />
        </div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : showPreview && preview ? <p className="text-xs text-muted-foreground">Shown as: <span className="font-medium text-foreground">{preview}</span></p> : null}
    </div>
  );
}

/** Search filter: Country (controlled) + State / City (normalized text, committed on blur/Enter). */
export function LocationFilter({ country, state, city, onChange }: { country: string; state: string; city: string; onChange: (v: { country: string; state: string; city: string }) => void }) {
  const countries = useCountries().data ?? [];
  const commit = (patch: Partial<{ country: string; state: string; city: string }>) => onChange({ country, state, city, ...patch });
  return (
    <div className="space-y-2">
      <SearchPicker ariaLabel="Country filter" options={countries.map((c) => ({ id: c, name: c }))} value={country} onChange={(c) => commit({ country: c })} placeholder="Search countries…" emptyLabel="All countries" />
      <input key={`s-${state}`} aria-label="State or province filter" className={inputCls} defaultValue={state} placeholder="State / Province"
        onBlur={(e) => { const v = normalizeLocationPart(e.target.value); if (v !== state) commit({ state: v }); }} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
      <input key={`c-${city}`} aria-label="City filter" className={inputCls} defaultValue={city} placeholder="City"
        onBlur={(e) => { const v = normalizeLocationPart(e.target.value); if (v !== city) commit({ city: v }); }} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
    </div>
  );
}
